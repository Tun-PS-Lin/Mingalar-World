--!nonstrict
-- Mingalar Raceway around the outside of the city. The road surface is painted
-- into the terrain (zero parts, no seams on curves); kerbs, barriers, the start
-- gantry and the grandstand are parts.
local RS = game:GetService("ReplicatedStorage")
local U = require(RS.Shared.Util)
local TrackPath = require(RS.Shared.TrackPath)
local Kit = require(script.Parent.Kit)

local M = Enum.Material
local Track = {}

--- The road surface is painted into the terrain at server start.
function Track.terrain()
	local tr = TrackPath.get()
	local N, W, pts = tr.N, tr.width, tr.pts
	local terrain = workspace.Terrain
	-- run-off then asphalt, as terrain strips along the centre line
	for _, spec in { { W + 16, M.Pavement }, { W, M.Asphalt } } do
		for i = 1, N do
			local p, q = pts[i], pts[i % N + 1]
			local cf = CFrame.lookAt((p + q) / 2, q) + Vector3.new(0, -2, 0)
			terrain:FillBlock(cf, Vector3.new(spec[1], 4, (q - p).Magnitude + 3), spec[2])
		end
	end
	-- access road from the north gate
	terrain:FillBlock(CFrame.new(0, -2, -346), Vector3.new(28, 4, 84), M.Asphalt)
end

function Track.build(root)
	local m = U.model(root, "Raceway")
	local tr = TrackPath.get()
	local N, W, wall = tr.N, tr.width, tr.wall
	local pts, T, R = tr.pts, tr.T, tr.R

	-- kerbs: red/white, two samples per block, on both sides
	local kerbs = U.folder(m, "Kerbs")
	local i = 1
	local k = 0
	while i <= N do
		local p, q = pts[i], pts[(i + 1) % N + 1]
		local mid = (p + q) / 2
		local len = (q - p).Magnitude + 0.2
		local col = k % 2 == 0 and 0xe2483d or 0xffffff
		for _, s in { -1, 1 } do
			local r = R[i]
			local c = mid + r * s * (W / 2 + 1.4)
			U.part(kerbs, Vector3.new(2.8, 0.3, len), CFrame.lookAt(c, c + (q - p)) + Vector3.new(0, 0.12, 0), col, { decor = true, noShadow = true })
		end
		i += 2
		k += 1
	end

	-- barriers: merged along straights, alternating blue/white panels
	local walls = U.folder(m, "Barriers")
	for _, s in { -1, 1 } do
		local j = 1
		local n = 0
		while j <= N do
			local span = 4
			local a = pts[j] + R[j] * s * wall
			local bIdx = (j + span - 1) % N + 1
			local b = pts[bIdx] + R[bIdx] * s * wall
			local mid = (a + b) / 2
			local col = n % 2 == 0 and 0x2e6fdb or 0xf4f1ea
			U.part(walls, Vector3.new(1.2, 2.6, (b - a).Magnitude + 0.6), CFrame.lookAt(mid, b) + Vector3.new(0, 1.3, 0), col, { material = M.SmoothPlastic })
			j += span
			n += 1
		end
	end

	-- start / finish
	local p0, t0 = pts[1], T[1]
	local face = CFrame.lookAt(p0, p0 + t0)
	for row = 0, 1 do
		for c = 0, 11 do
			local x = -W / 2 + (c + 0.5) * (W / 12)
			U.part(m, Vector3.new(W / 12, 0.06, 1.5), face * CFrame.new(x, 0.05, -0.75 + row * 1.5), (row + c) % 2 == 0 and 0x111111 or 0xffffff, { decor = true, noShadow = true })
		end
	end
	-- grid slots behind the line
	for slot = 1, 4 do
		local idx = (N - slot * 4) % N + 1
		local side = slot % 2 == 1 and -1 or 1
		local c = pts[idx] + R[idx] * side * 8
		local cf = CFrame.lookAt(c, c + T[idx])
		U.part(m, Vector3.new(6.4, 0.06, 0.4), cf * CFrame.new(0, 0.05, -5.2), 0xffffff, { decor = true, noShadow = true })
		for _, sx in { -3, 3 } do
			U.part(m, Vector3.new(0.4, 0.06, 4.4), cf * CFrame.new(sx, 0.05, -3.2), 0xffffff, { decor = true, noShadow = true })
		end
	end
	-- gantry + start lights (the client switches them during a race)
	local gantry = U.model(m, "Gantry")
	for _, s in { -1, 1 } do
		U.part(gantry, Vector3.new(2, 18, 2), face * CFrame.new(s * (W / 2 + 5), 9, 0), 0x23262f, { material = M.Metal })
	end
	U.part(gantry, Vector3.new(W + 12, 3.6, 2.4), face * CFrame.new(0, 16.8, 0), 0x23262f, { material = M.Metal })
	U.sign(gantry, "MINGALAR RACEWAY", W + 4, 3, face * CFrame.new(0, 17, -1.3), { fg = 0xffc83d, glow = true })
	U.sign(gantry, "MINGALAR RACEWAY", W + 4, 3, face * CFrame.new(0, 17, 1.3) * CFrame.Angles(0, math.pi, 0), { fg = 0xffc83d, glow = true })
	local lights = U.folder(gantry, "StartLights")
	for li = 1, 5 do
		local l = U.cylCF(lights, 0.7, 0.4, face * CFrame.new((li - 3) * 2.2, 14.4, 1.4) * CFrame.Angles(0, math.rad(90), 0), 0x330000, { decor = true, noShadow = true })
		l.Name = "Light" .. li
	end

	-- grandstand on the outside of the start straight
	do
		local idx = N - 40
		local c = pts[idx] - R[idx] * (wall + 22)
		local cf = CFrame.lookAt(c, c + R[idx])
		local stand = U.model(m, "Grandstand")
		local seat = { 0xe2483d, 0x2e6fdb, 0xffc83d, 0x5be28a }
		for row = 0, 5 do
			U.part(stand, Vector3.new(92, 2, 4), cf * CFrame.new(0, 1 + row * 2, 4 * row), 0xd8d8d8, { material = M.Concrete })
			for col = 0, 10 do
				U.part(stand, Vector3.new(7, 1, 1.6), cf * CFrame.new(-40 + col * 8, 2.5 + row * 2, 4 * row - 0.6), seat[(row + col) % 4 + 1], { decor = true })
			end
		end
		for _, s in { -1, 1 } do
			U.part(stand, Vector3.new(1.2, 24, 1.2), cf * CFrame.new(s * 46, 12, 24), 0x8b919c, { material = M.Metal })
		end
		U.part(stand, Vector3.new(96, 0.8, 28), cf * CFrame.new(0, 24.4, 12), 0x14182b, { material = M.Metal })
		U.sign(stand, "GRANDSTAND", 28, 3.2, cf * CFrame.new(0, 21.2, -0.8), { fg = 0xffffff, glow = true })
	end

	-- sponsor boards and tyre stacks at the sharpest bends
	local boards = { "MINGALAR NEWS", "ALACRITY RESEARCH", "VIRTUAL GARAGE", "MINGALAR WORLD", "VIRTUAL MALL" }
	local b = 0
	for idx = 30, N, 50 do
		local s = tr.K[idx] > 0.006 and 1 or -1
		local c = pts[idx] + R[idx] * s * (wall + 0.8)
		b += 1
		U.sign(m, boards[(b - 1) % #boards + 1], 18, 2.4, CFrame.lookAt(c + Vector3.new(0, 3.8, 0), c + Vector3.new(0, 3.8, 0) - R[idx] * s), { bg = ({ 0xe2483d, 0x2e6fdb, 0x14182b, 0xffc83d })[b % 4 + 1] })
	end
	for idx = 1, N, 12 do
		if tr.K[idx] > 0.008 then
			local nxt = pts[(idx + 20) % N + 1]
			local sgn = math.sign(R[idx]:Dot(nxt - pts[idx]))
			if sgn == 0 then
				sgn = 1
			end
			local c = pts[idx] - R[idx] * sgn * (wall - 1.6)
			for h = 0, 2 do
				U.cyl(m, 1, 0.84, c.X, h * 0.84, c.Z, h % 2 == 1 and 0xffffff or 0x1a1b1f, { decor = true })
			end
		end
	end
	for _, tree in { { 520, -420 }, { -540, -420 }, { 540, 440 }, { -540, 440 } } do
		Kit.pine(m, tree[1], tree[2], 1.6)
	end
end

return Track
