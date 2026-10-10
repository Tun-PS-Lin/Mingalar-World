--!nonstrict
-- Street furniture and vegetation shared by every area of the map.
local RS = game:GetService("ReplicatedStorage")
local U = require(RS.Shared.Util)

local M = Enum.Material
local Kit = {}

Kit.C = {
	grass = 0x6cc24a, road = 0x4f545b, walk = 0xd9dcdf, curb = 0xeeeeee, paving = 0xe2d6bf,
	brick = 0xb5573b, cap = 0xe9e2d6, white = 0xf4f1ea, dark = 0x2f3440, wood = 0xa9713f,
	hedge = 0x3f8f3a, trunk = 0x7a5234, leaf = { 0x3fa34d, 0x55b85a, 0x2f8a46 }, metal = 0x3a3f48,
}
local C = Kit.C

--- Rectangle minus a hole, as up to four rectangles {x0, x1, z0, z1}.
function Kit.minus(r, h)
	if not h then
		return { r }
	end
	local out = {}
	local function add(x0, x1, z0, z1)
		if x1 - x0 > 0.01 and z1 - z0 > 0.01 then
			table.insert(out, { x0 = x0, x1 = x1, z0 = z0, z1 = z1 })
		end
	end
	add(r.x0, h.x0, r.z0, r.z1)
	add(h.x1, r.x1, r.z0, r.z1)
	add(h.x0, h.x1, r.z0, h.z0)
	add(h.x0, h.x1, h.z1, r.z1)
	return out
end

--- Rectangle minus several (possibly non-overlapping) holes.
function Kit.minusAll(r, holes)
	local rects = { r }
	for _, h in holes do
		local nxt = {}
		for _, q in rects do
			if h.x0 < q.x1 and h.x1 > q.x0 and h.z0 < q.z1 and h.z1 > q.z0 then
				for _, part in Kit.minus(q, h) do
					table.insert(nxt, part)
				end
			else
				table.insert(nxt, q)
			end
		end
		rects = nxt
	end
	return rects
end

--- Flat slab between two corners with its top at `top`.
function Kit.slab(parent, x0, x1, z0, z1, top, col, material, thick)
	thick = thick or 1
	local p = U.span(parent, x0, x1, top - thick, top, z0, z1, col, { material = material or M.SmoothPlastic })
	p.CastShadow = false
	return p
end

function Kit.tree(parent, x, z, s, y)
	s = s or 1
	y = y or 0
	local shade = math.abs(math.floor(x * 3 + z * 7)) % 3 + 1
	U.cyl(parent, 0.9 * s, 6.4 * s, x, y, z, C.trunk, { material = M.Wood })
	local o = { material = M.Grass, decor = true }
	U.ball(parent, 4.8 * s, x, y + 9 * s, z, C.leaf[shade], o)
	U.ball(parent, 3.2 * s, x + 2.4 * s, y + 7.6 * s, z + 0.8 * s, C.leaf[shade], o)
	U.ball(parent, 3 * s, x - 1.8 * s, y + 11 * s, z - 1 * s, C.leaf[shade], o)
end

function Kit.pine(parent, x, z, s, y)
	s = s or 1
	y = y or 0
	U.cyl(parent, 0.7 * s, 5 * s, x, y, z, C.trunk, { material = M.Wood })
	-- stacked tiers: square tiers turned 45 degrees read as a cartoon pine
	for i = 0, 2 do
		local w = (5.2 - i * 1.4) * s
		U.part(parent, Vector3.new(w, 2.6 * s, w), CFrame.new(x, y + (5 + i * 3) * s, z) * CFrame.Angles(0, math.rad(45 * i), 0), 0x2c7a43, { material = M.Grass, decor = true })
	end
	U.part(parent, Vector3.new(1.2 * s, 2 * s, 1.2 * s), CFrame.new(x, y + 13.4 * s, z), 0x2c7a43, { material = M.Grass, decor = true })
end

function Kit.palm(parent, x, z, s, y)
	s = s or 1
	y = y or 0
	local lean = math.rad(((x * 13 + z * 7) % 20) - 10)
	for i = 0, 5 do
		U.part(parent, Vector3.new(1.1 * s, 2.4 * s, 1.1 * s), CFrame.new(x + math.sin(lean) * i * 0.6 * s, y + (1.2 + i * 2.2) * s, z), 0x9c7a50, { material = M.Wood, collide = i == 0 })
	end
	local top = Vector3.new(x + math.sin(lean) * 3.6 * s, y + 13.6 * s, z)
	for i = 1, 8 do
		local a = (i / 8) * math.pi * 2
		U.part(parent, Vector3.new(6.5 * s, 0.25, 1.4 * s), CFrame.new(top) * CFrame.Angles(0, a, 0) * CFrame.new(3 * s, -0.8 * s, 0) * CFrame.Angles(0, 0, math.rad(-22)), 0x3aa34a, { material = M.Grass, decor = true })
	end
	U.ball(parent, 1 * s, top.X, top.Y, top.Z, 0x6b4a2e, { decor = true })
end

function Kit.bush(parent, x, z, s, y, col)
	s = s or 1
	U.ball(parent, 2 * s, x, (y or 0) + 1 * s, z, col or C.hedge, { material = M.Grass, decor = true, noShadow = true })
	U.ball(parent, 1.4 * s, x + 1.4 * s, (y or 0) + 0.8 * s, z + 0.6 * s, col or C.hedge, { material = M.Grass, decor = true, noShadow = true })
end

--- Street lamp; `dir` (degrees) is where the arm points (0 = +Z, 90 = +X).
function Kit.lamp(parent, x, z, dir, y)
	y = y or 0
	local col = C.metal
	U.cyl(parent, 0.6, 0.8, x, y, z, col, { material = M.Metal })
	U.cyl(parent, 0.3, 12.4, x, y, z, col, { material = M.Metal })
	local a = math.rad(180 + (dir or 0))
	local base = CFrame.new(x, y + 12.2, z) * CFrame.Angles(0, a, 0)
	U.part(parent, Vector3.new(0.25, 0.25, 3.2), base * CFrame.new(0, 0, -1.5), col, { material = M.Metal, decor = true })
	U.part(parent, Vector3.new(1.1, 0.45, 1.8), base * CFrame.new(0, -0.35, -2.9), col, { material = M.Metal, decor = true })
	local bulb = U.neon(parent, Vector3.new(0.9, 0.1, 1.5), base * CFrame.new(0, -0.62, -2.9), 0xfff2c0)
	-- the lights switch on at night (see the day/night loop in Main)
	local l = Instance.new("SpotLight")
	l.Face = Enum.NormalId.Bottom
	l.Range = 26
	l.Angle = 110
	l.Brightness = 0
	l.Color = Color3.fromRGB(255, 236, 190)
	l.Shadows = false
	l.Parent = bulb
	game:GetService("CollectionService"):AddTag(l, "StreetLight")
end

--- Bench; rot (degrees) is the direction the sitter faces (0 = +Z, 90 = +X).
function Kit.bench(parent, x, z, rot, y)
	y = y or 0
	local cf = CFrame.new(x, y, z) * CFrame.Angles(0, math.rad(180 + (rot or 0)), 0)
	local wood, iron = 0xb07a45, 0x2f3440
	for i = 0, 2 do
		U.part(parent, Vector3.new(5.6, 0.2, 0.48), cf * CFrame.new(0, 1.1, -0.6 + i * 0.56), wood, { material = M.WoodPlanks })
	end
	local seat = Instance.new("Seat")
	seat.Size = Vector3.new(5, 0.3, 1.4)
	seat.CFrame = cf * CFrame.new(0, 1.05, 0) * CFrame.Angles(0, math.pi, 0)
	seat.Transparency = 1
	seat.Anchored = true
	seat.CanCollide = false
	seat.Parent = parent
	for i = 0, 1 do
		U.part(parent, Vector3.new(5.6, 0.44, 0.16), cf * CFrame.new(0, 1.7 + i * 0.6, 0.95) * CFrame.Angles(math.rad(12), 0, 0), wood, { material = M.WoodPlanks, decor = true })
	end
	for _, s in { -1, 1 } do
		U.part(parent, Vector3.new(0.2, 1, 1.6), cf * CFrame.new(s * 2.4, 0.5, 0), iron, { material = M.Metal, decor = true })
		U.part(parent, Vector3.new(0.2, 1.5, 0.2), cf * CFrame.new(s * 2.4, 1.75, 0.92), iron, { material = M.Metal, decor = true })
	end
end

function Kit.hedge(parent, x0, x1, z0, z1, h)
	h = h or 2.4
	U.span(parent, x0, x1, 0, h, z0, z1, C.hedge, { material = M.Grass })
end

function Kit.planter(parent, x, z, flower, size, y)
	size = size or 3.2
	y = y or 0
	U.box(parent, size, 1.6, size, x, y, z, 0xd8d2c6, { material = M.Concrete })
	U.box(parent, size - 0.5, 0.2, size - 0.5, x, y + 1.5, z, 0x6b4a2e, { material = M.Ground, decor = true })
	Kit.bush(parent, x, z, size * 0.32, y + 1.6, 0x4caf50)
	for i = 0, 3 do
		local a = i * 1.6
		U.ball(parent, 0.35, x + math.cos(a) * size * 0.3, y + 2.1, z + math.sin(a) * size * 0.3, flower or 0xff6b9a, { decor = true, noShadow = true })
	end
end

function Kit.flowerBed(parent, x0, x1, z0, z1, colors, y)
	y = y or 0
	colors = colors or { 0xff6b9a, 0xffc83d, 0xffffff, 0x8e5bd6 }
	U.span(parent, x0, x1, y, y + 0.5, z0, z1, 0x6b4a2e, { material = M.Ground })
	U.span(parent, x0 - 0.3, x1 + 0.3, y, y + 0.6, z0 - 0.3, z0, 0xd8d2c6, { material = M.Concrete, decor = true })
	U.span(parent, x0 - 0.3, x1 + 0.3, y, y + 0.6, z1, z1 + 0.3, 0xd8d2c6, { material = M.Concrete, decor = true })
	local rnd = U.seeded(math.floor(x0 * 31 + z0 * 17))
	-- flowers are grouped in clumps (a few parts, not hundreds)
	local x = x0 + 1
	while x < x1 - 0.5 do
		local z = z0 + 1
		while z < z1 - 0.5 do
			U.ball(parent, 0.7, x, y + 0.9, z, colors[math.floor(rnd() * #colors) + 1], { decor = true, noShadow = true, material = M.Fabric })
			z += 2.2
		end
		x += 2.2
	end
end

function Kit.trashCan(parent, x, z, y)
	U.cyl(parent, 0.8, 2, x, y or 0, z, 0x2f6e4a, { material = M.Metal })
	U.cyl(parent, 0.88, 0.16, x, (y or 0) + 2, z, 0x23262f, { material = M.Metal, decor = true })
end

function Kit.hydrant(parent, x, z, y)
	U.cyl(parent, 0.45, 1.6, x, y or 0, z, 0xe2483d)
	U.ball(parent, 0.45, x, (y or 0) + 1.65, z, 0xe2483d, { decor = true })
	U.box(parent, 1.2, 0.28, 0.28, x, (y or 0) + 0.8, z, 0xc9c9c9, { decor = true })
end

function Kit.trafficLight(parent, x, z, dir)
	local cf = CFrame.new(x, 0, z) * CFrame.Angles(0, math.rad(dir), 0)
	local dark = 0x2a2d33
	U.part(parent, Vector3.new(0.6, 11.2, 0.6), cf * CFrame.new(0, 5.6, 0), dark, { material = M.Metal })
	U.part(parent, Vector3.new(0.3, 0.3, 8), cf * CFrame.new(0, 10.8, -4), dark, { material = M.Metal, decor = true })
	U.part(parent, Vector3.new(1.2, 3.4, 1), cf * CFrame.new(0, 9.5, -7.2), 0x23262f, { decor = true })
	local cols = { 0xff3b30, 0xffc83d, 0x34c759 }
	for i, c in cols do
		local p = U.part(parent, Vector3.new(0.7, 0.7, 0.2), cf * CFrame.new(0, 10.6 - (i - 1) * 1, -7.75), c, { material = i == 3 and M.Neon or M.SmoothPlastic, decor = true, noShadow = true })
		p.Shape = Enum.PartType.Cylinder
		p.Size = Vector3.new(0.2, 0.7, 0.7)
		p.CFrame = cf * CFrame.new(0, 10.6 - (i - 1) * 1, -7.75) * CFrame.Angles(0, math.rad(90), 0)
	end
end

function Kit.busStop(parent, x, z, rot)
	local cf = CFrame.new(x, 0.4, z) * CFrame.Angles(0, math.rad(rot), 0)
	for _, s in { -1, 1 } do
		U.part(parent, Vector3.new(0.3, 6, 0.3), cf * CFrame.new(s * 4.8, 3, 1.2), 0x3a3f48, { material = M.Metal })
	end
	U.part(parent, Vector3.new(10.4, 0.3, 3.6), cf * CFrame.new(0, 6.1, 0), 0x2e6fdb, { decor = true })
	U.part(parent, Vector3.new(9.6, 4.8, 0.12), cf * CFrame.new(0, 3.2, 1.4), 0xcfe9ff, { material = M.Glass, transparency = 0.6 })
	U.part(parent, Vector3.new(7.2, 0.25, 1.2), cf * CFrame.new(0, 1.2, 0.7), 0xb07a45, { material = M.WoodPlanks })
	U.sign(parent, "BUS", 2.8, 1.2, cf * CFrame.new(4.8, 7.4, 0) * CFrame.Angles(0, math.pi, 0), { bg = 0x2e6fdb })
end

function Kit.rock(parent, x, z, s)
	local p = U.part(parent, Vector3.new(4.4 * s, 2.4 * s, 3.6 * s), CFrame.new(x, 0.6 * s, z) * CFrame.Angles(0.2, x, 0.1), 0x9a9a9a, { material = M.Slate })
	return p
end

function Kit.flagPole(parent, x, z, col)
	U.cyl(parent, 0.2, 20, x, 0, z, 0xd0d0d0, { material = M.Metal })
	U.ball(parent, 0.4, x, 20.2, z, 0xffc83d, { decor = true })
	-- the flag waves on the client (tagged), so the server stays idle
	local flag = U.part(parent, Vector3.new(6, 3.6, 0.1), CFrame.new(x + 3, 17.8, z), col, { material = M.Fabric, decor = true })
	game:GetService("CollectionService"):AddTag(flag, "Flag")
end

return Kit
