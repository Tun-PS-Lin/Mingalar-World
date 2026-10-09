--!nonstrict
-- Arcade car physics and the AI driver for the raceway. Pure functions (no
-- engine calls), shared so they can be simulated headlessly in tests.
local U = require(script.Parent.Util)

local RacePhysics = {}

function RacePhysics.nearest(car, tr)
	local best, bd = car.k, math.huge
	for i = -25, 25 do
		local k = (car.k - 1 + i) % tr.N + 1
		local p = tr.pts[k]
		local d = (p.X - car.x) ^ 2 + (p.Z - car.z) ^ 2
		if d < bd then
			bd, best = d, k
		end
	end
	car.prevK = car.k
	car.k = best
end

function RacePhysics.step(car, inp, st, tr, dt)
	local W = tr.width
	local p, r = tr.pts[car.k], tr.R[car.k]
	local lat = (car.x - p.X) * r.X + (car.z - p.Z) * r.Z
	local off = math.abs(lat) > W / 2 + 3.2
	local boost = inp.nitro and 1.25 or 1
	local top = st.top * boost * (off and 0.45 or 1)
	if inp.throttle > 0 then
		car.vf += st.accel * (inp.nitro and 1.8 or 1) * inp.throttle * math.max(0.05, 1 - math.max(0, car.vf) / top) * dt
	end
	if inp.brake > 0 then
		car.vf -= (car.vf > 1 and 68 or 24) * inp.brake * dt
	end
	car.vf = math.max(car.vf, -28)
	car.vf -= car.vf * (off and 1.4 or 0.12) * dt
	if car.vf > top then
		car.vf = U.damp(car.vf, top, 2, dt)
	end
	if inp.throttle == 0 and inp.brake == 0 and math.abs(car.vf) < 0.6 then
		car.vf = 0
	end
	local maxSteer = 0.55 / (1 + math.abs(car.vf) / 76)
	car.steer = U.damp(car.steer, inp.steer * maxSteer, 9, dt)
	local yawRate = car.vf * math.tan(car.steer) / 7.8
	car.h += yawRate * dt * (inp.handbrake and 1.35 or 1)
	car.vs -= yawRate * car.vf * dt * 0.12
	local grip = st.grip * (inp.handbrake and 0.18 or 1) * (off and 0.6 or 1)
	car.vs *= math.exp(-grip * 9 * dt)
	if inp.handbrake then
		car.vf -= car.vf * 0.6 * dt
	end
	-- heading h: forward is (sin h, cos h) in x/z
	local fx, fz = math.sin(car.h), math.cos(car.h)
	local rx, rz = -math.cos(car.h), math.sin(car.h)
	car.x += (fx * car.vf + rx * car.vs) * dt
	car.z += (fz * car.vf + rz * car.vs) * dt
	car.yawRate = yawRate
	car.accelNow = inp.throttle - inp.brake
	RacePhysics.nearest(car, tr)
	-- barriers
	local q, rr = tr.pts[car.k], tr.R[car.k]
	local l2 = (car.x - q.X) * rr.X + (car.z - q.Z) * rr.Z
	local lim = tr.wall - 3.2
	if math.abs(l2) > lim then
		local s = math.sign(l2)
		car.x -= rr.X * (math.abs(l2) - lim) * s
		car.z -= rr.Z * (math.abs(l2) - lim) * s
		local t = tr.T[car.k]
		local along = math.atan2(t.X, t.Z)
		local ahead = math.abs(U.wrapAngle(along - car.h)) < math.pi / 2
		car.h = U.dampAngle(car.h, ahead and along or along + math.pi, 6, dt)
		car.vf *= 1 - math.min(0.9, 2.5 * dt)
		car.vs *= 0.3
	end
end

function RacePhysics.ai(car, tr, racing)
	if not racing then
		return { throttle = 0, brake = 0, steer = 0 }
	end
	local look = math.floor(math.clamp(math.abs(car.vf) * 0.5, 12, 60) / tr.step)
	local ahead = (car.k - 1 + look) % tr.N + 1
	local maxK = 0
	for i = 0, 70, 5 do
		maxK = math.max(maxK, tr.K[(car.k - 1 + i) % tr.N + 1])
	end
	local target = math.min(car.top, math.sqrt(52 / math.max(maxK, 1e-4)))
	local p, r = tr.pts[ahead], tr.R[ahead]
	local tx, tz = p.X + r.X * car.lane * 0.5, p.Z + r.Z * car.lane * 0.5
	local err = U.wrapAngle(math.atan2(tx - car.x, tz - car.z) - car.h)
	return {
		throttle = car.vf < target and 1 or 0,
		brake = car.vf > target + 6 and 0.7 or 0,
		steer = math.clamp(err * 2.4, -1, 1),
		handbrake = false,
	}
end


--- Track progress along the centre line; returns true when a lap is completed
--- (crossing the line forwards having passed all four sectors).
function RacePhysics.lapCheck(car, tr)
	local prev = car.prevK or car.k
	local dk = car.k - prev
	if dk > tr.N / 2 then
		dk -= tr.N
	elseif dk < -tr.N / 2 then
		dk += tr.N
	end
	car.prog += dk
	local sector = math.floor(((car.k - 1) / tr.N) * 4)
	if sector == car.cps + 1 then
		car.cps = sector
	end
	if prev > tr.N * 0.9 and car.k < tr.N * 0.1 and dk > 0 and car.cps >= 3 then
		car.lap += 1
		car.cps = 0
		return true
	end
	return false
end

return RacePhysics
