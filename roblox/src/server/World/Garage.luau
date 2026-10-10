--!nonstrict
-- Virtual Garage: showroom with five turntables, a mod shop and a parking lot.
-- The showroom cars themselves are built on each client (with that player's
-- mods) on top of the turntable markers in workspace.Map.Garage.Turntables.
local RS = game:GetService("ReplicatedStorage")
local U = require(RS.Shared.Util)
local Config = require(RS.Shared.Config)
local CarModel = require(RS.Shared.CarModel)
local Kit = require(script.Parent.Kit)
local City = require(script.Parent.City)

local M = Enum.Material
local G = Config.Garage
local FLOOR = Config.Curb + 0.6
local TURN_Z = 84

local Garage = {}
Garage.Lineup = {
	{ kind = "apex", x = -236 }, { kind = "summit", x = -203 }, { kind = "vortex", x = -170 },
	{ kind = "breeze", x = -137 }, { kind = "thunder", x = -104 },
}

local function parked(parent, kind, paint, x, z, rotDeg)
	local mods = Config.defaultMods(kind)
	mods.paint = paint
	local car = CarModel.build(kind, mods, { parent = parent })
	car.model:PivotTo(CFrame.new(x, Config.Curb + 0.2, z) * CFrame.Angles(0, math.rad(rotDeg), 0))
	-- one simple collider instead of colliding car parts
	local box = U.box(parent, car.width, 5, car.length, x, Config.Curb, z, 0, { noShadow = true })
	box.Transparency = 1
	box.CFrame = CFrame.new(x, Config.Curb + 2.5, z) * CFrame.Angles(0, math.rad(rotDeg), 0)
end

function Garage.build(root)
	local m = U.model(root, "Garage")
	local x0, x1, z0, z1, H = G.x0, G.x1, G.z0, G.z1, G.h
	local shell = 0x2a2d33
	Kit.slab(m, x0, x1, z0, z1, FLOOR, 0x8d939c, M.Marble, 1.4)
	Kit.slab(m, x0 + 2, x1 - 2, 104, z1 - 2, FLOOR + 0.02, 0x6b7079, M.Concrete, 0.5)
	local T = 1.6
	U.span(m, x0, x0 + T, 0, H, z0, z1, shell, { material = M.Concrete })
	U.span(m, x1 - T, x1, 0, H, z0, z1, shell, { material = M.Concrete })
	U.span(m, x0, x1, 0, H, z1 - T, z1, shell, { material = M.Concrete })
	U.span(m, x0, x1, 14, H, z0, z0 + T, shell, { material = M.Concrete })
	-- glass front with an open entrance (x -184..-156)
	for _, r in { { x0, -184 }, { -156, x1 } } do
		U.span(m, r[1], r[2], 0, 14, z0 + 0.4, z0 + 0.9, 0xbfe4ff, { material = M.Glass, transparency = 0.55, reflectance = 0.3 })
		for x = r[1], r[2], 12 do
			U.span(m, x - 0.3, x + 0.3, 0, 14, z0 + 0.3, z0 + 1, 0x23262f, { material = M.Metal, decor = true })
		end
	end
	-- roof + canopy and sign
	U.span(m, x0 - 1, x1 + 1, H, H + 1.2, z0 - 6, z1 + 1, 0x23262f, { material = M.Concrete })
	U.neon(m, Vector3.new(x1 - x0 + 2, 0.5, 0.6), CFrame.new((x0 + x1) / 2, H - 2.4, z0 - 0.6), 0xffc83d)
	U.signAt(m, "VIRTUAL GARAGE", 52, 6, (x0 + x1) / 2, H - 6.4, z0 - 0.2, 180, { fg = 0xffc83d, glow = true })
	for x = x0 + 8, x1, 24 do
		U.span(m, x - 0.25, x + 0.25, 0, H, z0 - 5.8, z0 - 5.4, 0x23262f, { material = M.Metal })
	end
	-- ceiling LED strips with a few real lights
	for x = x0 + 12, x1 - 6, 18 do
		U.neon(m, Vector3.new(0.6, 0.2, z1 - z0 - 12), CFrame.new(x, H - 1.4, (z0 + z1) / 2), 0xffffff, x % 36 == 0 and { kind = "SurfaceLight", range = 30, brightness = 1 } or nil)
	end
	Kit.slab(m, x0, x1, 23, z0, Config.Curb + 0.12, 0xd4d7dc, M.Pavement, 0.5)
	Kit.planter(m, -248, 36, 0xffc83d, 4, Config.Curb)
	Kit.planter(m, -92, 36, 0xffc83d, 4, Config.Curb)
	U.signAt(m, "Walk up to a car and press E to customise it and race", 36, 1.8, (x0 + x1) / 2, 19.2, z0 + 1.9, 0, { bg = 0x14182b, fg = 0xffffff })

	-- turntables (the cars on them are built per player on the client)
	local tt = U.folder(m, "Turntables")
	for _, d in Garage.Lineup do
		U.cyl(m, 8.4, 0.36, d.x, FLOOR, TURN_Z, 0x5d636e, { material = M.Metal })
		local disc = U.cyl(tt, 7.8, 0.16, d.x, FLOOR + 0.36, TURN_Z, 0xbfc4ca, { material = M.Marble })
		disc.Name = d.kind
		disc:SetAttribute("Kind", d.kind)
		U.neon(m, Vector3.new(16.4, 0.08, 0.3), CFrame.new(d.x, FLOOR + 0.4, TURN_Z - 8.2), 0xffc83d)
		local col = U.box(m, 13, 4, 13, d.x, FLOOR, TURN_Z, 0, { noShadow = true })
		col.Transparency = 1
		U.box(m, 0.2, 2, 0.2, d.x, FLOOR, TURN_Z - 10.4, 0x23262f, { material = M.Metal, decor = true })
		local spec = Config.Cars[d.kind]
		U.signAt(m, spec.name .. "\n" .. spec.tag, 5.2, 1.8, d.x, FLOOR + 2.8, TURN_Z - 10.5, 180, { bg = 0x14182b, fg = 0xffffff })
		U.cyl(m, 2.4, 0.3, d.x, H - 1.9, TURN_Z, 0xfff4dc, { material = M.Neon, decor = true, noShadow = true })
		local a = City.anchor(m, d.x, FLOOR + 2, TURN_Z - 12, "CarPrompt")
		City.prompt(a, "car:" .. d.kind, "Customise & race", spec.name, 9)
	end

	-- workshop at the back
	do
		local z = 124
		for _, w in { { -236, true }, { -200, false } } do
			local x = w[1]
			for _, s in { -1, 1 } do
				U.box(m, 1.2, 7.2, 1.2, x + s * 4.8, FLOOR, z, 0xe2483d)
			end
			for _, s in { -1, 1 } do
				U.box(m, 0.6, 0.4, 9.2, x + s * 2.4, FLOOR + (w[2] and 4.4 or 0.8), z, 0x8b919c, { material = M.Metal })
			end
			if w[2] then
				local mods = Config.defaultMods("apex")
				mods.paint, mods.finish = 0xb8bec6, "matte"
				local car = CarModel.build("apex", mods, { parent = m })
				car.model:PivotTo(CFrame.new(x, FLOOR + 4.8, z) * CFrame.Angles(0, math.rad(90), 0))
			end
		end
		for i = 0, 2 do
			for j = 0, 3 do
				local t = U.cylCF(m, 0.9, 0.7, CFrame.new(-164 + j * 2.2, FLOOR + 1.2 + i * 2.2, z1 - 3.2) * CFrame.Angles(0, math.rad(90), 0), 0x1a1b1f, { decor = true })
				t.Name = "Tyre"
			end
		end
		for _, tc in { { -140, 0xe2483d }, { -133, 0x2e6fdb } } do
			U.box(m, 6, 3.6, 2.4, tc[1], FLOOR, z1 - 3.6, tc[2], { material = M.Metal })
			for i = 1, 5 do
				U.box(m, 5.6, 0.06, 0.1, tc[1], FLOOR + i * 0.6, z1 - 4.85, 0xd0d0d0, { decor = true, noShadow = true })
			end
		end
		U.box(m, 12, 2, 2.8, -112, FLOOR, z1 - 3.8, 0xa9713f, { material = M.WoodPlanks })
		U.box(m, 12, 4.8, 0.2, -112, FLOOR + 3.2, z1 - 2, 0x5d636e, { material = M.DiamondPlate, decor = true })
		U.signAt(m, "MOD SHOP", 18, 3.2, -170, 16.4, z1 - 1.8, 180, { bg = 0x14182b, fg = 0xffc83d, glow = true })
		U.signAt(m, "RACE DAY\nMingalar Raceway", 5.2, 7.2, x0 + 1.8, 8.8, 96, 90, { bg = 0xe2483d })
		U.signAt(m, "RACE DAY\nMingalar Raceway", 5.2, 7.2, x1 - 1.8, 8.8, 96, -90, { bg = 0xe2483d })
	end

	-- parking lot
	do
		Kit.slab(m, -264, -112, 152, 240, Config.Curb + 0.12, 0x4a4f57, M.Asphalt, 0.5)
		for x = -252, -124, 12 do
			U.span(m, x - 0.18, x + 0.18, Config.Curb + 0.12, Config.Curb + 0.16, 160, 170, 0xffffff, { decor = true, noShadow = true })
			U.span(m, x - 0.18, x + 0.18, Config.Curb + 0.12, Config.Curb + 0.16, 222, 232, 0xffffff, { decor = true, noShadow = true })
		end
		parked(m, "summit", 0x8b919c, -246, 165, 0)
		parked(m, "apex", 0xffc83d, -222, 227, 180)
		parked(m, "thunder", 0xe2483d, -186, 165, 0)
		parked(m, "breeze", 0x2bb3e6, -150, 227, 180)
		for _, x in { -240, -192, -144 } do
			Kit.lamp(m, x, 196, 0, Config.Curb)
		end
	end
end

return Garage
