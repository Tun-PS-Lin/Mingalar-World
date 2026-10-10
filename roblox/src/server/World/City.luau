--!nonstrict
-- The town itself: terrain, raised city blocks, roads and markings, the city
-- wall and gates, street furniture, trees, parks, the luxury home and pool,
-- the gym and the mini golf course.
local RS = game:GetService("ReplicatedStorage")
local U = require(RS.Shared.Util)
local Config = require(RS.Shared.Config)
local Kit = require(script.Parent.Kit)

local M = Enum.Material
local C = Kit.C
local CURB = Config.Curb

local City = {}

local function prompt(part, action, actionText, objectText, dist)
	local p = Instance.new("ProximityPrompt")
	p.ActionText = actionText
	p.ObjectText = objectText or ""
	p.MaxActivationDistance = dist or 12
	p.RequiresLineOfSight = false
	p.KeyboardKeyCode = Enum.KeyCode.E
	p:SetAttribute("Action", action)
	p.Parent = part
	return p
end
City.prompt = prompt

--- Invisible anchor part to hang a prompt on.
local function anchor(parent, x, y, z, name)
	local p = U.box(parent, 1, 1, 1, x, y, z, 0, { decor = true, noShadow = true })
	p.Transparency = 1
	p.Name = name or "Prompt"
	return p
end
City.anchor = anchor

--- Terrain is voxel data, not parts: it is painted at server start (it can't be
--- saved into the pre-built map model).
function City.terrain()
	local terrain = workspace.Terrain
	terrain:FillBlock(CFrame.new(0, -6, 0), Vector3.new(3600, 12, 3600), M.Grass)
	-- rolling hills on the horizon
	local rnd = U.seeded(7)
	for i = 1, 22 do
		local a = (i / 22) * math.pi * 2 + rnd() * 0.1
		local d = 1500 + rnd() * 150
		terrain:FillBall(Vector3.new(math.cos(a) * d, -40, math.sin(a) * d), 160 + rnd() * 120, M.Grass)
	end
	-- the pool is carved out of the ground and filled with real (swimmable) water
	local P = Config.Pool
	terrain:FillBlock(CFrame.new((P.x0 + P.x1) / 2, -6, (P.z0 + P.z1) / 2), Vector3.new(P.x1 - P.x0 + 8, 13, P.z1 - P.z0 + 8), M.Air)
	terrain:FillBlock(CFrame.new((P.x0 + P.x1) / 2, -5.6, (P.z0 + P.z1) / 2), Vector3.new(P.x1 - P.x0, 10, P.z1 - P.z0), M.Water)
	-- pond in the south-east park
	terrain:FillBlock(CFrame.new(156, -3, 132), Vector3.new(36, 8, 22), M.Air)
	terrain:FillBlock(CFrame.new(156, -2.6, 132), Vector3.new(34, 4.4, 20), M.Water)
end

function City.build(root: Instance)
	local Ground = U.folder(root, "Ground")
	local Street = U.folder(root, "Street")
	local Nature = U.folder(root, "Nature")

	local rnd = U.seeded(7)
	local P = Config.Pool
	-- ------------------------------------------------------- city floor
	local CITY = Config.City
	local pondHole = { x0 = 138, x1 = 174, z0 = 121, z1 = 143 }
	local poolHole = { x0 = P.x0, x1 = P.x1, z0 = P.z0, z1 = P.z1 }
	for _, r in Kit.minusAll({ x0 = CITY.x0, x1 = CITY.x1, z0 = CITY.z0, z1 = CITY.z1 }, { poolHole, pondHole }) do
		Kit.slab(Ground, r.x0, r.x1, r.z0, r.z1, 0.1, C.road, M.Asphalt, 2)
	end

	-- raised blocks: pavement ring + grass, kerb stones, holes for water
	local function block(x0, x1, z0, z1, hole, walk)
		walk = walk or 9
		local outer = { x0 = x0, x1 = x1, z0 = z0, z1 = z1 }
		local inner = { x0 = x0 + walk, x1 = x1 - walk, z0 = z0 + walk, z1 = z1 - walk }
		for _, q in Kit.minus(outer, inner) do
			Kit.slab(Ground, q.x0, q.x1, q.z0, q.z1, CURB, C.walk, M.Pavement, 1)
		end
		local rects = Kit.minusAll(inner, hole and { hole } or {})
		for _, q in rects do
			Kit.slab(Ground, q.x0, q.x1, q.z0, q.z1, CURB + 0.02, C.grass, M.Grass, 1)
		end
		local k = C.curb
		U.span(Ground, x0, x1, 0, CURB + 0.06, z0, z0 + 0.6, k, { material = M.Concrete, decor = true, noShadow = true })
		U.span(Ground, x0, x1, 0, CURB + 0.06, z1 - 0.6, z1, k, { material = M.Concrete, decor = true, noShadow = true })
		U.span(Ground, x0, x0 + 0.6, 0, CURB + 0.06, z0, z1, k, { material = M.Concrete, decor = true, noShadow = true })
		U.span(Ground, x1 - 0.6, x1, 0, CURB + 0.06, z0, z1, k, { material = M.Concrete, decor = true, noShadow = true })
	end
	block(-292, -14, -252, -14)
	block(14, 292, -252, -14, poolHole)
	block(-292, -14, 14, 252)
	block(14, 292, 14, 252, pondHole)
	block(-340, -14, -300, -276, nil, 6)
	block(14, 340, -300, -276, nil, 6)
	block(-340, -14, 276, 300, nil, 6)
	block(14, 340, 276, 300, nil, 6)
	block(-340, -316, -276, 276, nil, 6)
	block(316, 340, -276, 276, nil, 6)

	-- ---------------------------------------------------- road markings
	local white, yellow = 0xf4f4f4, 0xffc83d
	local function mark(x0, x1, z0, z1, col)
		U.span(Street, x0, x1, 0.1, 0.16, z0, z1, col, { decor = true, noShadow = true })
	end
	local function lineZ(x, z0, z1)
		mark(x - 0.6, x - 0.3, z0, z1, yellow)
		mark(x + 0.3, x + 0.6, z0, z1, yellow)
	end
	local function lineX(z, x0, x1)
		mark(x0, x1, z - 0.6, z - 0.3, yellow)
		mark(x0, x1, z + 0.3, z + 0.6, yellow)
	end
	lineZ(0, -252, -24); lineZ(0, 24, 252); lineZ(0, -300, -284); lineZ(0, 284, 300)
	lineX(0, -292, -24); lineX(0, 24, 292)
	for _, x in { -304, 304 } do
		lineZ(x, -252, 252)
	end
	for _, z in { -264, 264 } do
		lineX(z, -292, 292)
	end
	local function zebra(cx, cz, alongX)
		for i = -5, 5 do
			if alongX then
				mark(cx + i * 2.5 - 0.7, cx + i * 2.5 + 0.7, cz - 3, cz + 3, white)
			else
				mark(cx - 3, cx + 3, cz + i * 2.5 - 0.7, cz + i * 2.5 + 0.7, white)
			end
		end
	end
	zebra(0, -20, true); zebra(0, 20, true); zebra(-20, 0, false); zebra(20, 0, false)
	zebra(0, -246, true); zebra(0, 246, true)
	Kit.trafficLight(Street, -17, -17, 180); Kit.trafficLight(Street, 17, 17, 0)
	Kit.trafficLight(Street, 17, -17, 90); Kit.trafficLight(Street, -17, 17, -90)

	-- --------------------------------------------------------- city wall
	local Wall = U.folder(root, "Wall")
	local wallH = 9
	local function wall(x0, x1, z0, z1)
		U.span(Wall, x0, x1, 0, wallH, z0, z1, C.brick, { material = M.Brick })
		U.span(Wall, x0 - 0.4, x1 + 0.4, wallH, wallH + 0.7, z0 - 0.4, z1 + 0.4, C.cap, { material = M.Concrete, decor = true })
		local along = x1 - x0 > z1 - z0
		local len = along and x1 - x0 or z1 - z0
		local t = 0
		while t <= len do
			local x = along and x0 + t or (x0 + x1) / 2
			local z = along and (z0 + z1) / 2 or z0 + t
			U.box(Wall, 3.2, wallH + 1.6, 3.2, x, 0, z, C.cap, { material = M.Concrete })
			t += 24
		end
	end
	wall(-343, -24, -303, -300); wall(24, 343, -303, -300)
	wall(-343, -24, 300, 303); wall(24, 343, 300, 303)
	wall(-343, -340, -300, 300); wall(340, 343, -300, 300)
	for _, s in { -1, 1 } do
		local z = s * 301.5
		for _, x in { -21, 21 } do
			U.box(Wall, 6, 18, 6, x, 0, z, C.cap, { material = M.Concrete })
			U.box(Wall, 7.2, 1.2, 7.2, x, 18, z, C.dark, { decor = true })
		end
		U.box(Wall, 48, 4, 4, 0, 18, z, C.dark)
		U.signAt(Wall, "MINGALAR WORLD", 36, 3.2, 0, 20, z - s * 2.1, s > 0 and 180 or 0, { fg = 0xffc83d, glow = true })
		U.signAt(Wall, "MINGALAR WORLD", 36, 3.2, 0, 20, z + s * 2.1, s > 0 and 0 or 180, { fg = 0xffc83d, glow = true })
		-- boom barrier: the town ends at the gates (the raceway is reached from the garage)
		U.box(Wall, 1.2, 2.8, 1.2, -16, 0, z, C.dark)
		for i = 0, 8 do
			U.box(Wall, 3.4, 0.6, 0.6, -13.8 + i * 3.4, 2.3, z, i % 2 == 1 and 0xffffff or 0xe2483d, { decor = true })
		end
		local gate = U.box(Wall, 36, 40, 1.4, 0, 0, z, 0, { noShadow = true })
		gate.Transparency = 1
	end

	-- ------------------------------------------------ street furniture
	for z = -232, 232, 48 do
		if math.abs(z) > 28 then
			Kit.lamp(Street, -18.4, z, 90, CURB)
			Kit.lamp(Street, 18.4, z + 24, -90, CURB)
		end
	end
	for x = -272, 272, 48 do
		if math.abs(x) > 28 then
			Kit.lamp(Street, x, -18.4, 0, CURB)
			Kit.lamp(Street, x + 24, 18.4, 180, CURB)
		end
	end
	for _, p in { { -19, -80 }, { 19, 88 }, { -120, 19 }, { 128, -19 }, { -19, 180 } } do
		Kit.trashCan(Street, p[1], p[2], CURB)
	end
	for _, p in { { -19.2, -128 }, { 19.2, 60 }, { 72, -19.2 }, { -60, 19.2 } } do
		Kit.hydrant(Street, p[1], p[2], CURB)
	end
	Kit.busStop(Street, -21, -200, 90)
	Kit.busStop(Street, 21, 200, -90)

	-- --------------------------------------------------------------- trees
	local clear = { { -40, -10, -176, -128 }, { 10, 44, -168, -120 }, { -192, -148, 10, 40 }, { 60, 100, 10, 40 }, { 172, 264, -40, -10 } }
	local function open(x, z)
		for _, c in clear do
			if x > c[1] and x < c[2] and z > c[3] and z < c[4] then
				return false
			end
		end
		return true
	end
	for z = -224, 224, 32 do
		if math.abs(z) >= 32 then
			if open(-26, z) then Kit.tree(Nature, -26, z, 0.9, CURB) end
			if open(26, z) then Kit.tree(Nature, 26, z, 0.9, CURB) end
		end
	end
	for x = -272, 272, 32 do
		if math.abs(x) >= 32 then
			if open(x, -26) then Kit.tree(Nature, x, -26, 0.85, CURB) end
			if open(x, 26) then Kit.tree(Nature, x, 26, 0.85, CURB) end
		end
	end
	for x = -320, 320, 28 do
		if math.abs(x) > 32 then
			Kit.pine(Nature, x, -288, 1, CURB)
			Kit.pine(Nature, x, 288, 1, CURB)
		end
	end
	for z = -260, 260, 28 do
		Kit.pine(Nature, -328, z, 1, CURB)
		Kit.pine(Nature, 328, z, 1, CURB)
	end
	-- countryside beyond the raceway
	for i = 1, 160 do
		local a = rnd() * math.pi * 2
		local d = 600 + rnd() * 700
		local x, z = math.cos(a) * d * 1.05, math.sin(a) * d
		if rnd() < 0.45 then
			Kit.pine(Nature, x, z, 1.2 + rnd() * 1.2)
		else
			Kit.tree(Nature, x, z, 1.1 + rnd() * 1.1)
		end
	end

	City.buildParks(root)
	City.buildHome(root)
	City.buildGym(root)
	City.buildGolf(root)
end

-- ===================================================================== parks
function City.buildParks(root)
	local Park = U.folder(root, "Parks")
	-- fountain plaza south of the mall
	do
		local cx, cz = -160, -48
		Kit.slab(Park, cx - 32, cx + 32, cz - 20, cz + 20, CURB + 0.12, 0xd9cfbd, M.Cobblestone, 0.5)
		U.cyl(Park, 10, 1.8, cx, CURB, cz, 0xf2f2f2, { material = M.Marble })
		U.cyl(Park, 9, 0.3, cx, CURB + 1.5, cz, 0x2bb3e6, { material = M.Glass, transparency = 0.15, reflectance = 0.3, decor = true })
		U.cyl(Park, 1.4, 5.2, cx, CURB, cz, 0xf2f2f2, { material = M.Marble })
		U.cyl(Park, 3.6, 0.6, cx, CURB + 5.2, cz, 0xf2f2f2, { material = M.Marble })
		local jet = U.cyl(Park, 0.5, 3, cx, CURB + 5.8, cz, 0xbfe9ff, { material = M.Glass, transparency = 0.4, decor = true })
		jet.Name = "FountainJet"
		local sparkle = Instance.new("ParticleEmitter")
		sparkle.Color = ColorSequence.new(Color3.fromRGB(220, 245, 255))
		sparkle.Size = NumberSequence.new(0.5, 0.1)
		sparkle.Transparency = NumberSequence.new(0.2, 1)
		sparkle.Lifetime = NumberRange.new(0.8, 1.2)
		sparkle.Rate = 40
		sparkle.Speed = NumberRange.new(10, 14)
		sparkle.SpreadAngle = Vector2.new(18, 18)
		sparkle.Acceleration = Vector3.new(0, -30, 0)
		sparkle.EmissionDirection = Enum.NormalId.Right
		sparkle.Parent = jet
		for _, b in { { cx, cz - 15, 0 }, { cx, cz + 15, 180 }, { cx - 18, cz, 90 }, { cx + 18, cz, -90 } } do
			Kit.bench(Park, b[1], b[2], b[3], CURB)
		end
		for _, l in { { cx - 26, cz - 14 }, { cx + 26, cz - 14 }, { cx - 26, cz + 14 }, { cx + 26, cz + 14 } } do
			Kit.lamp(Park, l[1], l[2], 0, CURB)
		end
		Kit.flowerBed(Park, cx - 60, cx - 38, cz - 12, cz + 12, nil, CURB)
		Kit.flowerBed(Park, cx + 38, cx + 60, cz - 12, cz + 12, { 0xff7a3d, 0xffc83d, 0xffffff }, CURB)
		Kit.flagPole(Park, cx - 68, cz, U.c(0x2e6fdb))
		Kit.flagPole(Park, cx + 68, cz, U.c(0xe2483d))
	end
	-- pond park (the water is terrain, carved in City.build)
	do
		local cx, cz = 156, 132
		U.span(Park, cx - 19, cx + 19, 0, CURB + 0.3, cz - 12, cz - 11, 0xb9b2a4, { material = M.Concrete })
		U.span(Park, cx - 19, cx + 19, 0, CURB + 0.3, cz + 11, cz + 12, 0xb9b2a4, { material = M.Concrete })
		U.span(Park, cx - 19, cx - 18, 0, CURB + 0.3, cz - 12, cz + 12, 0xb9b2a4, { material = M.Concrete })
		U.span(Park, cx + 18, cx + 19, 0, CURB + 0.3, cz - 12, cz + 12, 0xb9b2a4, { material = M.Concrete })
		for i = 0, 6 do
			local a = i * 0.9 + 0.3
			U.cyl(Park, 1.4 + (i % 3) * 0.4, 0.1, cx + math.cos(a) * 10, -0.55, cz + math.sin(a) * 6, 0x4caf50, { decor = true, noShadow = true })
		end
		for _, a in { 0.4, 1.4, 2.6, 3.6, 4.6, 5.6 } do
			Kit.tree(Park, cx + math.cos(a) * 30, cz + math.sin(a) * 20, 1, CURB)
		end
		Kit.bench(Park, cx, cz - 17, 0, CURB)
		Kit.bench(Park, cx, cz + 17, 180, CURB)
		Kit.rock(Park, cx - 22, cz - 8, 1.1)
		Kit.rock(Park, cx + 22, cz + 8, 0.9)
	end
	-- garden between the office and the home
	do
		Kit.slab(Park, 136, 172, -232, -48, CURB + 0.1, 0xd9cfbd, M.Cobblestone, 0.5)
		for z = -220, -60, 32 do
			Kit.flowerBed(Park, 140, 150, z, z + 12, { 0xff6b9a, 0xffffff, 0xffc83d }, CURB)
			Kit.flowerBed(Park, 158, 168, z, z + 12, { 0x8e5bd6, 0xff7a3d, 0xffffff }, CURB)
			Kit.lamp(Park, 154, z - 4, 0, CURB)
		end
		for _, z in { -200, -136, -72 } do
			Kit.bench(Park, 154, z + 12, 90, CURB)
		end
		for _, p in { { 132, -236 }, { 176, -236 }, { 132, -44 }, { 176, -44 } } do
			Kit.palm(Park, p[1], p[2], 1, CURB)
		end
	end
	-- basketball court
	do
		Kit.slab(Park, 132, 184, 196, 240, CURB + 0.1, 0xd9763f, M.SmoothPlastic, 0.5)
		U.span(Park, 157.7, 158.3, CURB + 0.1, CURB + 0.16, 196, 240, 0xffffff, { decor = true, noShadow = true })
		for _, z in { 199, 237 } do
			U.cyl(Park, 0.25, 8.4, 158, CURB, z, 0x5d636e, { material = M.Metal })
			local dir = z < 218 and 1 or -1
			U.box(Park, 3.6, 2.4, 0.2, 158, CURB + 7, z + dir, 0xffffff)
			local hoop = U.part(Park, Vector3.new(0.15, 1.4, 1.4), CFrame.new(158, CURB + 7.2, z + dir * 2) * CFrame.Angles(0, 0, math.rad(90)), 0xff7a3d, { decor = true })
			hoop.Shape = Enum.PartType.Cylinder
		end
	end
	-- trees and picnic tables east of the garage
	for _, p in { { -60, 60 }, { -44, 88 }, { -64, 116 }, { -40, 132 }, { -56, 152 }, { -32, 60 }, { -32, 112 } } do
		Kit.tree(Park, p[1], p[2], 1.05, CURB)
	end
	for _, p in { { -52, 72 }, { -48, 124 } } do
		U.box(Park, 5.2, 1.5, 2.4, p[1], CURB, p[2], 0xa9713f, { material = M.WoodPlanks })
		for _, s in { -1, 1 } do
			U.box(Park, 5.2, 0.9, 0.8, p[1], CURB, p[2] + s * 2, 0x8a5a30, { material = M.WoodPlanks })
		end
	end
end

-- ================================================================ luxury home
function City.buildHome(root)
	local Home = U.model(root, "LuxuryHome")
	local H = Config.Home
	local white, wood, dark = 0xf6f4ef, 0x9a6a3e, 0x2a2d33
	local glassO = { material = M.Glass, transparency = 0.3, reflectance = 0.3 }
	Kit.slab(Home, H.x0 - 4, H.x1 + 4, H.z0 - 4, H.z1 + 4, CURB + 0.2, 0xe8e4dc, M.Marble, 0.5)
	-- ground floor
	U.span(Home, H.x0, H.x1, CURB, CURB + 11, H.z0, H.z1, white, { material = M.Concrete })
	U.span(Home, H.x0 + 4, H.x0 + 32, CURB + 1.6, CURB + 8.8, H.z1, H.z1 + 0.3, 0x9fc8e0, glassO)
	-- cantilevered first floor
	U.span(Home, H.x0 + 8, H.x1 - 4, CURB + 11, CURB + 22, H.z0 - 6, H.z1 + 6, wood, { material = M.WoodPlanks })
	U.span(Home, H.x0 + 10, H.x1 - 8, CURB + 13, CURB + 20, H.z1 + 6, H.z1 + 6.3, 0x9fc8e0, glassO)
	U.span(Home, H.x0 + 10, H.x1 - 8, CURB + 13, CURB + 20, H.z0 - 6.3, H.z0 - 6, 0x9fc8e0, glassO)
	U.span(Home, H.x0 + 7, H.x1 - 3, CURB + 22, CURB + 23, H.z0 - 7, H.z1 + 7, dark, { decor = true })
	U.span(Home, H.x0 - 1, H.x1 + 1, CURB + 11, CURB + 12, H.z0 - 1, H.z1 + 1, dark, { decor = true })
	-- roof terrace rail + solar panels
	U.span(Home, H.x0, H.x0 + 8, CURB + 12, CURB + 14.2, H.z1, H.z1 + 0.2, 0xcfe9ff, glassO)
	for i = 0, 3 do
		for j = 0, 1 do
			U.part(Home, Vector3.new(8, 0.25, 5.2), CFrame.new(H.x0 + 22 + i * 10, CURB + 23.8, H.z0 + 4 + j * 8) * CFrame.Angles(math.rad(-17), 0, 0), 0x24408f, { material = M.Glass, reflectance = 0.3, decor = true })
		end
	end
	-- front door, canopy, steps, garage door, sign
	U.span(Home, 229, 235, CURB, CURB + 7.4, H.z1, H.z1 + 0.6, 0x5a3b22, { material = M.Wood })
	U.span(Home, 225, 239, CURB + 8, CURB + 8.6, H.z1, H.z1 + 7, dark, { decor = true })
	for i = 0, 2 do
		U.span(Home, 227 - i, 237 + i, CURB, CURB + 0.6 - i * 0.2, H.z1 + 1 + i * 1.2, H.z1 + 2.2 + i * 1.2, white, { material = M.Marble })
	end
	U.span(Home, 241, 255, CURB, CURB + 7.4, H.z1, H.z1 + 0.4, 0x5d636e, { material = M.DiamondPlate })
	U.signAt(Home, "LUXURY HOME GALLERY", 20, 2, 202, CURB + 9.8, H.z1 + 0.4, 0, { bg = 0x14182b, fg = 0xffc83d })
	local door = anchor(Home, 232, CURB + 2, H.z1 + 5)
	prompt(door, "home", "Tour", "Luxury Home Gallery")
	-- driveway, lawn, parked car spot, palms
	Kit.slab(Home, 240, 256, H.z1 + 2, -23, CURB + 0.1, 0xc9c2b4, M.Cobblestone, 0.5)
	Kit.slab(Home, 228, 236, H.z1 + 4.5, -23, CURB + 0.1, 0xe8dcc4, M.Pavement, 0.5)
	Kit.hedge(Home, 184, 226, -29, -27)
	Kit.hedge(Home, 258, 280, -29, -27)
	for _, x in { 192, 208, 220 } do
		Kit.palm(Home, x, -52, 1, CURB)
	end
	Kit.palm(Home, 268, -60, 1.1, CURB)
	Kit.flowerBed(Home, 188, 224, -80, -74, nil, CURB)
	Kit.planter(Home, 226, -85, 0xff6b9a, 3.2, CURB)
	Kit.planter(Home, 238, -85, 0xffc83d, 3.2, CURB)

	-- pool garden (water is terrain)
	local P = Config.Pool
	local tile = 0x7fd6f0
	for _, r in Kit.minus({ x0 = 180, x1 = 264, z0 = -220, z1 = -148 }, { x0 = P.x0 - 1.6, x1 = P.x1 + 1.6, z0 = P.z0 - 1.6, z1 = P.z1 + 1.6 }) do
		Kit.slab(Home, r.x0, r.x1, r.z0, r.z1, CURB + 0.12, 0xc49a6c, M.WoodPlanks, 0.5)
	end
	U.span(Home, P.x0 - 1.6, P.x1 + 1.6, CURB, CURB + 0.3, P.z0 - 1.6, P.z0, 0xffffff, { material = M.Marble })
	U.span(Home, P.x0 - 1.6, P.x1 + 1.6, CURB, CURB + 0.3, P.z1, P.z1 + 1.6, 0xffffff, { material = M.Marble })
	U.span(Home, P.x0 - 1.6, P.x0, CURB, CURB + 0.3, P.z0, P.z1, 0xffffff, { material = M.Marble })
	U.span(Home, P.x1, P.x1 + 1.6, CURB, CURB + 0.3, P.z0, P.z1, 0xffffff, { material = M.Marble })
	U.span(Home, P.x0, P.x1, -11, -10, P.z0, P.z1, tile, { material = M.Slate })
	U.span(Home, P.x0 - 0.5, P.x0, -11, CURB, P.z0, P.z1, tile, { material = M.Slate })
	U.span(Home, P.x1, P.x1 + 0.5, -11, CURB, P.z0, P.z1, tile, { material = M.Slate })
	U.span(Home, P.x0, P.x1, -11, CURB, P.z0 - 0.5, P.z0, tile, { material = M.Slate })
	U.span(Home, P.x0, P.x1, -11, CURB, P.z1, P.z1 + 0.5, tile, { material = M.Slate })
	for i = 1, 4 do
		U.span(Home, P.x0 + 1, P.x1 - 1, -10, -9.9, P.z0 + i * 5.6 - 0.25, P.z0 + i * 5.6 + 0.25, 0x2e6fdb, { decor = true, noShadow = true })
	end
	-- ladder
	for _, z in { -199.2, -198 } do
		U.cyl(Home, 0.12, 4, P.x0 + 0.7, -2.6, z, 0xd0d0d0, { material = M.Metal, decor = true })
	end
	-- loungers + umbrellas + cabana
	for _, x in { 200, 212, 224, 236 } do
		U.box(Home, 2.4, 0.9, 5.6, x, CURB + 0.1, -160, 0xffffff)
		U.part(Home, Vector3.new(2.4, 1.6, 0.6), CFrame.new(x, CURB + 1.6, -162.6) * CFrame.Angles(math.rad(25), 0, 0), 0xffffff, { decor = true })
		U.box(Home, 2.2, 0.2, 3.6, x, CURB + 1, -159.6, 0x2bb3e6, { material = M.Fabric, decor = true })
	end
	for _, u in { { 206, 0xff5b8a }, { 230, 0xffc83d } } do
		U.cyl(Home, 0.16, 6.4, u[1], CURB, -161, 0xd0d0d0, { material = M.Metal, decor = true })
		U.cyl(Home, 4.8, 0.4, u[1], CURB + 6.4, -161, u[2], { material = M.Fabric, decor = true })
		U.cyl(Home, 3, 0.6, u[1], CURB + 6.8, -161, u[2], { material = M.Fabric, decor = true })
	end
	for _, p in { { 248.6, -215.4 }, { 261.4, -215.4 }, { 248.6, -194.6 }, { 261.4, -194.6 } } do
		U.cyl(Home, 0.3, 6.8, p[1], CURB, p[2], 0xffffff)
	end
	U.span(Home, 247, 263, CURB + 6.8, CURB + 7.4, -217, -193, 0xf4f1ea, { material = M.Fabric, decor = true })
	Kit.hedge(Home, 178, 266, -224, -222)
	Kit.hedge(Home, 178, 180, -222, -144)
	Kit.hedge(Home, 264, 266, -222, -144)
	U.signAt(Home, "POOL", 4.8, 2, 182.5, CURB + 4.8, -188, 90, { bg = 0x2bb3e6, both = true })
end

-- ======================================================================= gym
function City.buildGym(root)
	local Gym = U.model(root, "Gym")
	local G = Config.Gym
	Kit.slab(Gym, G.x0 - 4, G.x1 + 4, G.z0 - 4, G.z1 + 4, CURB + 0.2, 0xd8d8d8, M.Concrete, 0.5)
	U.span(Gym, G.x0, G.x1, CURB, CURB + 14, G.z0, G.z1, 0x3c4350, { material = M.Concrete })
	U.span(Gym, G.x0 - 0.6, G.x1 + 0.6, CURB + 10.8, CURB + 12.8, G.z0 - 0.6, G.z1 + 0.6, 0xff7a3d, { decor = true })
	U.span(Gym, G.x0 - 1, G.x1 + 1, CURB + 14, CURB + 14.8, G.z0 - 1, G.z1 + 1, 0x23262f, { decor = true })
	U.span(Gym, G.x0 - 0.3, G.x0, CURB + 2, CURB + 8.8, 158, 186, 0x86b6d6, { material = M.Glass, transparency = 0.25, reflectance = 0.3 })
	U.signAt(Gym, "GYM", 14, 3.6, G.x0 - 0.4, CURB + 11.8, 172, -90, { fg = 0xffffff })
	local mat = G.mat
	Kit.slab(Gym, mat.X - 12, mat.X + 10, 160, 184, CURB + 0.2, 0x2e6fdb, M.Fabric, 0.4)
	Kit.slab(Gym, mat.X - 5, mat.X + 5, 167, 177, CURB + 0.25, 0x23408f, M.Fabric, 0.4)
	U.box(Gym, 6, 1.8, 1.6, 180, CURB, 162, 0x5d636e, { material = M.Metal })
	for i = 0, 2 do
		U.box(Gym, 1.2, 0.44, 0.44, 178.4 + i * 1.6, CURB + 1.8, 162, 0xcfd3d6, { material = M.Metal, decor = true })
		for _, s in { -1, 1 } do
			U.box(Gym, 0.32, 0.84, 0.84, 178.4 + i * 1.6 + s * 0.6, CURB + 1.6, 162, ({ 0xe2483d, 0xffc83d, 0x5be28a })[i + 1], { decor = true })
		end
	end
	for _, z in { 161, 167 } do
		U.cyl(Gym, 0.16, 6, 174, CURB, z, 0x5d636e, { material = M.Metal })
	end
	U.part(Gym, Vector3.new(6, 0.2, 0.2), CFrame.new(174, CURB + 5.8, 164) * CFrame.Angles(0, math.rad(90), 0), 0xcfd3d6, { material = M.Metal, decor = true })
	local a = anchor(Gym, mat.X, CURB + 2, mat.Z)
	prompt(a, "gym", "Work out", "Jumping jacks")
end

-- ================================================================= mini golf
-- Three holes, laid out west to east. Walls are real parts: the ball (built on
-- the client) bounces off them with Roblox physics.
City.GolfHoles = {
	{ par = 2, z = 40, obstacles = {} },
	{ par = 3, z = 60, obstacles = { { 208, 210.4, 54, 61.4 }, { 220, 222.4, 58.6, 66 } } },
	{ par = 3, z = 80, obstacles = { { 224.4, 226.4, 74, 77.4 }, { 224.4, 226.4, 82.6, 86 } }, mover = { x = 213.2, w = 2.4, d = 4.8, amp = 2.6 } },
}
City.GolfTee = 197
City.GolfCup = 230.6

function City.buildGolf(root)
	local Golf = U.model(root, "MiniGolf")
	local G = Config.Golf
	Kit.slab(Golf, G.x0, G.x1, G.z0 - 4, G.z1 - 4, CURB + 0.08, 0x58a53c, M.Grass, 0.5)
	Kit.hedge(Golf, G.x0 - 2, G.x1 + 2, G.z0 - 6, G.z0 - 4)
	Kit.hedge(Golf, G.x0 - 2, G.x1 + 2, G.z1 - 4, G.z1 - 2)
	Kit.hedge(Golf, G.x1, G.x1 + 2, G.z0 - 4, G.z1 - 4)
	Kit.hedge(Golf, G.x0 - 2, G.x0, G.z0 - 4, 52)
	Kit.hedge(Golf, G.x0 - 2, G.x0, 64, G.z1 - 4)
	U.box(Golf, 2, 9.2, 2, G.x0 - 1, CURB, 51, 0xffffff)
	U.box(Golf, 2, 9.2, 2, G.x0 - 1, CURB, 65, 0xffffff)
	U.box(Golf, 2.4, 3, 16.4, G.x0 - 1, CURB + 8.4, 58, 0x2fa84f, { decor = true })
	U.signAt(Golf, "MINI GOLF", 14, 2.4, G.x0 - 2.3, CURB + 9.9, 58, -90, { fg = 0xffffff })
	for i, hole in City.GolfHoles do
		local x0, x1, z0, z1 = 192, 236, hole.z - 6, hole.z + 6
		local green = Kit.slab(Golf, x0, x1, z0, z1, CURB + 0.5, 0x35b558, M.Grass, 0.4)
		green.Name = "Green"
		green.CanCollide = true
		for _, w in { { x0 - 0.6, x1 + 0.6, z0 - 0.6, z0 }, { x0 - 0.6, x1 + 0.6, z1, z1 + 0.6 }, { x0 - 0.6, x0, z0, z1 }, { x1, x1 + 0.6, z0, z1 } } do
			local rail = U.span(Golf, w[1], w[2], CURB + 0.5, CURB + 1.2, w[3], w[4], 0xffffff)
			rail.Name = "Rail"
		end
		U.span(Golf, City.GolfTee - 1.2, City.GolfTee + 1.2, CURB + 0.5, CURB + 0.54, hole.z - 1.2, hole.z + 1.2, 0x1f7a3b, { decor = true, noShadow = true })
		U.cyl(Golf, 0.8, 0.05, City.GolfCup, CURB + 0.5, hole.z, 0x0b0d14, { decor = true, noShadow = true })
		U.cyl(Golf, 0.08, 4.4, City.GolfCup, CURB + 0.5, hole.z, 0xffffff, { decor = true })
		U.box(Golf, 1.6, 1, 0.08, City.GolfCup + 0.84, CURB + 3.5, hole.z, 0xe2483d, { decor = true })
		U.signAt(Golf, tostring(i), 1.8, 1.8, x0 - 1.8, CURB + 2.6, hole.z - 4.4, -90, { bg = 0xffc83d, fg = 0x2a1d00, both = true })
		for _, o in hole.obstacles do
			local b = U.span(Golf, o[1], o[2], CURB + 0.5, CURB + 1.6, o[3], o[4], 0xff7a3d)
			b.Name = "Rail"
		end
		if hole.mover then
			local mv = U.box(Golf, hole.mover.w, 1.1, hole.mover.d, hole.mover.x, CURB + 0.5, hole.z, 0x8e5bd6)
			mv.Name = "Mover"
			mv:SetAttribute("BaseZ", hole.z)
			mv:SetAttribute("Amp", hole.mover.amp)
			game:GetService("CollectionService"):AddTag(mv, "Mover")
		end
	end
	-- windmill
	U.box(Golf, 4, 6.8, 4, 237.2, CURB, 46, 0xe2483d)
	U.box(Golf, 4.8, 1.8, 4.8, 237.2, CURB + 6.8, 46, 0xffffff)
	local blades = U.model(Golf, "Windmill")
	local hub = U.part(blades, Vector3.new(0.5, 0.5, 0.5), CFrame.new(234.7, CURB + 6.4, 46), 0xffffff, { decor = true })
	U.part(blades, Vector3.new(0.24, 10, 1.2), CFrame.new(234.7, CURB + 6.4, 46), 0xffffff, { decor = true })
	U.part(blades, Vector3.new(0.24, 1.2, 10), CFrame.new(234.7, CURB + 6.4, 46), 0xffffff, { decor = true })
	blades.PrimaryPart = hub
	game:GetService("CollectionService"):AddTag(blades, "Spin")
	local a = anchor(Golf, G.x0 + 2, CURB + 2, 58)
	prompt(a, "golf", "Play", "Mini Golf")
end

return City
