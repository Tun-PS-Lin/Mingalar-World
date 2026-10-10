--!nocheck
-- Headless tests for the Roblox port, run with Lune:   lune run tools/test.luau
--  * every car model with every mod value builds
--  * every gun builds (as a Tool and as a display model)
--  * every avatar option builds its accessories and paints an R15 rig
--  * the raceway: AI rivals and an autopilot player complete 3 laps, with
--    sensible lap times and no car leaving the track for long
--  * the track keeps clear of the city wall and the start grid is on it
local process = require("@lune/process")
local L = require("./lib/loader")
L.install()
local roblox = L.roblox
local Instance, Vector3 = roblox.Instance, roblox.Vector3
local R = L.require
local Shared, Server = L.Shared, L.Server

local failed = 0
local function check(ok, msg)
	print((ok and "  ✓ " or "  ✗ ") .. msg)
	if not ok then
		failed += 1
	end
end
local function try(label, fn)
	local ok, err = pcall(fn)
	if not ok then
		print("    " .. label .. ": " .. tostring(err))
	end
	return ok
end

local Config = R(Shared.Config)
local CarModel = R(Shared.CarModel)
local GunModel = R(Shared.GunModel)
local TrackPath = R(Shared.TrackPath)
local RacePhysics = R(Shared.RacePhysics)
local Avatar = R(Server.Avatar)

-- ------------------------------------------------------------------ cars
print("Cars")
do
	local built, okAll = 0, true
	for _, kind in Config.CarOrder do
		local variants = { Config.defaultMods(kind) }
		for key, list in Config.ModOptions do
			for _, o in list do
				local m = Config.defaultMods(kind)
				m[key] = o[1]
				table.insert(variants, m)
			end
		end
		local nitro = Config.defaultMods(kind)
		nitro.nitro = true
		table.insert(variants, nitro)
		for _, mods in variants do
			okAll = try(kind, function()
				local car = CarModel.build(kind, mods)
				assert(#car.wheels == 4, "4 wheels")
				assert(car.model.PrimaryPart == car.root, "root is primary")
				CarModel.place(car, roblox.CFrame.new(10, 0, 10), 1.3, 0.2)
				built += 1
			end) and okAll
		end
	end
	check(okAll, ("%d car variants build and place (every mod value on every model)"):format(built))
	local car = CarModel.build("apex", Config.defaultMods("apex"))
	check(#L.parts(car.model) < 120, ("a car is %d parts"):format(#L.parts(car.model)))
	local st = Config.carStats("vortex", { engine = "turbo", tires = "slick", kit = "race", spoiler = "gt" })
	check(st.top > Config.Cars.vortex.top and st.grip > Config.Cars.vortex.grip, "mods improve stats")
end

-- ------------------------------------------------------------------ guns
print("Guns")
do
	local ok = true
	for _, id in Config.WeaponOrder do
		ok = try(id, function()
			local tool, muzzle = GunModel.build(id, true)
			assert(tool.ClassName == "Tool" and tool:FindFirstChild("Handle"), "tool with handle")
			assert(muzzle.Parent == tool.Handle, "muzzle on handle")
			local model = GunModel.build(id, false)
			model:ScaleTo(2)
		end) and ok
	end
	check(ok, "all six weapons build as tools and display models")
end

-- ---------------------------------------------------------------- avatars
print("Avatars")
do
	local function rig()
		local m = Instance.new("Model")
		for _, n in { "Head", "UpperTorso", "LowerTorso", "LeftUpperArm", "LeftLowerArm", "LeftHand", "RightUpperArm", "RightLowerArm", "RightHand", "LeftUpperLeg", "LeftLowerLeg", "LeftFoot", "RightUpperLeg", "RightLowerLeg", "RightFoot" } do
			local p = Instance.new("Part")
			p.Name = n
			p.Parent = m
		end
		return m
	end
	local n, ok = 0, true
	for key, list in Config.Avatar.Options do
		for _, o in list do
			ok = try(key .. "=" .. tostring(o[1]), function()
				local look = Avatar.sanitize({ [key] = o[1] })
				assert(look[key] == o[1], "sanitize keeps valid values")
				for _, acc in Avatar._accessories(look) do
					assert(acc:FindFirstChild("Handle"), "accessory handle")
				end
				Avatar._paint(rig(), look)
				n += 1
			end) and ok
		end
	end
	check(ok, ("%d avatar options build accessories and paint an R15 rig"):format(n))
	local bad = Avatar.sanitize({ hair = "<script>", skin = -5, shirtColor = 0xffffff + 1, body = "female" })
	check(bad.hair == Config.Avatar.Default.hair and bad.skin == Config.Avatar.Default.skin and bad.body == "female", "sanitize rejects bad input from clients")
	local skirt = rig()
	Avatar._paint(skirt, Avatar.sanitize({ pants = "skirt", pattern = "star" }))
	check(skirt:FindFirstChild("MW_Skirt") ~= nil and skirt.UpperTorso:FindFirstChild("MW_Design") ~= nil, "skirt and shirt design are added")
	local tee = rig()
	Avatar._paint(tee, Avatar.sanitize({ shirt = "tee", shirtColor = 0xe2483d, skin = 0xffe0c4 }))
	check(tee.LeftLowerArm.Color ~= tee.LeftUpperArm.Color, "t-shirts have short sleeves (bare forearms)")
end

-- ------------------------------------------------------------------ track
print("Raceway")
local tr = TrackPath.get()
do
	local City = Config.City
	local minGap = math.huge
	for i = 1, tr.N do
		for _, s in { -1, 1 } do
			local p = tr.pts[i] + tr.R[i] * s * tr.wall
			local dx = math.max(City.x0 - 4 - p.X, 0, p.X - City.x1 - 4)
			local dz = math.max(City.z0 - 4 - p.Z, 0, p.Z - City.z1 - 4)
			minGap = math.min(minGap, math.sqrt(dx * dx + dz * dz))
		end
	end
	check(minGap > 10, ("barriers stay %d studs clear of the city wall"):format(minGap))
	check(tr.length > 2000 and tr.length < 4000, ("lap length %d studs"):format(tr.length))
end

-- full race: three AI rivals and an autopilot "player" driving the same code
do
	local function newCar(slot, side)
		local k = (tr.N - slot) % tr.N + 1
		local p, r, t = tr.pts[k], tr.R[k], tr.T[k]
		return { x = p.X + r.X * side * 8, z = p.Z + r.Z * side * 8, h = math.atan2(t.X, t.Z), vf = 0, vs = 0, steer = 0, k = k, lap = 0, cps = 0, prog = -slot, lane = side * 8, laps = {}, offT = 0 }
	end
	local cars = {}
	for i, kind in { "apex", "vortex", "thunder" } do
		local st = Config.carStats(kind, Config.defaultMods(kind))
		local c = newCar(i * 4, i % 2 == 1 and -1 or 1)
		c.top = st.top * (0.86 + i * 0.04)
		c.stats = { top = c.top, accel = st.accel, grip = st.grip }
		c.name = "AI " .. kind
		table.insert(cars, c)
	end
	local me = newCar(16, 1)
	me.stats = Config.carStats("summit", Config.defaultMods("summit"))
	me.top = me.stats.top
	me.name = "autopilot"
	table.insert(cars, me)
	local dt, t = 1 / 60, 0
	while t < 400 do
		t += dt
		for _, c in cars do
			if c.lap < 3 then
				local inp = RacePhysics.ai(c, tr, true)
				RacePhysics.step(c, inp, c.stats, tr, dt)
				local p, r = tr.pts[c.k], tr.R[c.k]
				if math.abs((c.x - p.X) * r.X + (c.z - p.Z) * r.Z) > tr.width / 2 + 3.2 then
					c.offT += dt
				end
				if RacePhysics.lapCheck(c, tr) then
					table.insert(c.laps, t - (c.lastLap or 0))
					c.lastLap = t
				end
			end
		end
		local done = true
		for _, c in cars do
			done = done and c.lap >= 3
		end
		if done then
			break
		end
	end
	for _, c in cars do
		local lt = {}
		for _, l in c.laps do
			table.insert(lt, ("%.1fs"):format(l))
		end
		check(c.lap >= 3, ("%-12s finished %d laps [%s], %.1fs off track"):format(c.name, c.lap, table.concat(lt, ", "), c.offT))
		check(c.offT < 8, ("%-12s stays on the asphalt"):format(c.name))
	end
end

print(failed == 0 and "\nAll checks passed" or ("\n" .. failed .. " CHECK(S) FAILED"))
process.exit(failed == 0 and 0 or 1)
