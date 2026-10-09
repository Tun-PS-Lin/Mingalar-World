--!nonstrict
-- Centre line of the raceway: a closed Catmull-Rom curve through the control
-- points, resampled at even spacing. Computed identically on server and client.
local Config = require(script.Parent.Config)

local TrackPath = {}
local cached

local function catmull(p0, p1, p2, p3, t)
	local t2, t3 = t * t, t * t * t
	return (p1 * 2 + (p2 - p0) * t + (p0 * 2 - p1 * 5 + p2 * 4 - p3) * t2 + (p1 * 3 - p0 - p2 * 3 + p3) * t3) * 0.5
end

function TrackPath.get()
	if cached then
		return cached
	end
	local ctrl = {}
	for _, c in Config.Track.control do
		table.insert(ctrl, Vector3.new(c[1], 0, c[2]))
	end
	local n = #ctrl
	-- dense polyline
	local dense = {}
	for i = 1, n do
		local p0, p1, p2, p3 = ctrl[(i - 2) % n + 1], ctrl[i], ctrl[i % n + 1], ctrl[(i + 1) % n + 1]
		for s = 0, 39 do
			table.insert(dense, catmull(p0, p1, p2, p3, s / 40))
		end
	end
	-- cumulative length
	local cum = { 0 }
	for i = 2, #dense + 1 do
		local a, b = dense[i - 1], dense[(i - 1) % #dense + 1]
		cum[i] = cum[i - 1] + (b - a).Magnitude
	end
	local total = cum[#cum]
	local N = Config.Track.samples
	local pts = {}
	local j = 1
	for k = 0, N - 1 do
		local d = total * k / N
		while cum[j + 1] < d do
			j += 1
		end
		local a, b = dense[j], dense[j % #dense + 1]
		local t = (d - cum[j]) / math.max(1e-6, cum[j + 1] - cum[j])
		pts[k + 1] = a:Lerp(b, t)
	end
	local T, R, K = {}, {}, {}
	for i = 1, N do
		local a, b = pts[(i - 2) % N + 1], pts[i % N + 1]
		local t = (b - a).Unit
		T[i] = t
		R[i] = Vector3.new(-t.Z, 0, t.X) -- right-hand side when driving
	end
	local step = total / N
	for i = 1, N do
		local a, b = T[(i - 7) % N + 1], T[(i + 5) % N + 1]
		K[i] = math.acos(math.clamp(a:Dot(b), -1, 1)) / (12 * step)
	end
	cached = { pts = pts, T = T, R = R, K = K, N = N, length = total, step = step, width = Config.Track.width, wall = Config.Track.width / 2 + 12 }
	return cached
end

return TrackPath
