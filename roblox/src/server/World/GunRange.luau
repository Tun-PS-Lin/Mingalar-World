--!nonstrict
-- Gun range building, weapon wall and targets. Targets are tagged
-- "RangeTarget"; the client animates them and does the shooting locally
-- (a shooting round is a solo activity), the server only hands out the gun.
local RS = game:GetService("ReplicatedStorage")
local CollectionService = game:GetService("CollectionService")
local U = require(RS.Shared.Util)
local Config = require(RS.Shared.Config)
local GunModel = require(RS.Shared.GunModel)
local Kit = require(script.Parent.Kit)
local City = require(script.Parent.City)

local M = Enum.Material
local R = Config.Range
local FLOOR = Config.Curb + 0.6
local GunRange = {}

local function target(parent, kind, x, z, move, speed)
	local m = U.model(parent, kind == "board" and "Board" or "Dummy")
	local base = U.cyl(m, 1, 0.3, x, FLOOR, z, 0x23262f, { material = M.Metal, decor = true })
	m.PrimaryPart = base
	if kind == "board" then
		for _, s in { -1.6, 1.6 } do
			U.box(m, 0.2, 3.2, 0.2, x + s, FLOOR, z, 0x7a5234, { material = M.Wood, decor = true })
		end
		local b = U.box(m, 3.2, 3.2, 0.12, x, FLOOR + 3.2, z, 0xf4f1ea, { decor = true })
		b.Name = "Board"
		b.CanQuery = true
		local g = Instance.new("SurfaceGui")
		g.Face = Enum.NormalId.Front -- faces the shooters (north, -Z)
		g.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
		g.PixelsPerStud = 30
		g.Parent = b
		for i = 5, 1, -1 do
			local f = Instance.new("Frame")
			f.AnchorPoint = Vector2.new(0.5, 0.5)
			f.Position = UDim2.fromScale(0.5, 0.5)
			f.Size = UDim2.fromScale(i * 0.19, i * 0.19)
			f.BackgroundColor3 = i % 2 == 1 and Color3.fromRGB(226, 72, 61) or Color3.new(1, 1, 1)
			f.BorderSizePixel = 0
			local c = Instance.new("UICorner")
			c.CornerRadius = UDim.new(1, 0)
			c.Parent = f
			f.Parent = g
		end
	else
		U.box(m, 0.24, 2.2, 0.24, x, FLOOR + 0.3, z, 0x7a5234, { material = M.Wood, decor = true })
		local body = U.box(m, 2.2, 2.4, 1, x, FLOOR + 2.2, z, 0xd9c49a, { material = M.Fabric, decor = true })
		body.Name = "Body"
		body.CanQuery = true
		for _, s in { -1.5, 1.5 } do
			U.box(m, 0.7, 2, 0.8, x + s, FLOOR + 2.4, z, 0xd9c49a, { material = M.Fabric, decor = true })
		end
		local head = U.ball(m, 0.68, x, FLOOR + 5.3, z, 0xe6d3a8, { material = M.Fabric, decor = true })
		head.Name = "Head"
		head.CanQuery = true
		-- bullseye on the chest, facing the shooters
		local g = Instance.new("SurfaceGui")
		g.Face = Enum.NormalId.Front
		g.Parent = body
		for i = 3, 1, -1 do
			local f = Instance.new("Frame")
			f.AnchorPoint = Vector2.new(0.5, 0.5)
			f.Position = UDim2.fromScale(0.5, 0.45)
			f.Size = UDim2.fromScale(i * 0.22, i * 0.22)
			f.SizeConstraint = Enum.SizeConstraint.RelativeXX
			f.BackgroundColor3 = i % 2 == 1 and Color3.fromRGB(226, 72, 61) or Color3.new(1, 1, 1)
			f.BorderSizePixel = 0
			local c = Instance.new("UICorner")
			c.CornerRadius = UDim.new(1, 0)
			c.Parent = f
			f.Parent = g
		end
	end
	m:SetAttribute("Kind", kind)
	m:SetAttribute("Move", move or 0)
	m:SetAttribute("Speed", speed or 1)
	CollectionService:AddTag(m, "RangeTarget")
	return m
end

function GunRange.build(root)
	local m = U.model(root, "GunRange")
	local x0, x1, z0, z1, H = R.x0, R.x1, R.z0, R.z1, R.h
	local wall = 0x4d5446
	Kit.slab(m, x0, x1, z0, z1, FLOOR, 0x9a9d96, M.Concrete, 1.4)
	Kit.slab(m, x0 + 2, x1 - 2, z0 + 2, 80, FLOOR + 0.02, 0x2f3440, M.Slate, 0.5)
	local T = 1.6
	U.span(m, x0, x0 + T, 0, H, z0, z1, wall, { material = M.Concrete })
	U.span(m, x1 - T, x1, 0, H, z0, z1, wall, { material = M.Concrete })
	U.span(m, x0, x1, 0, H, z1 - T, z1, wall, { material = M.Concrete })
	U.span(m, x0, 70, 0, H, z0, z0 + T, wall, { material = M.Concrete })
	U.span(m, 90, x1, 0, H, z0, z0 + T, wall, { material = M.Concrete })
	U.span(m, 70, 90, 11, H, z0, z0 + T, wall, { material = M.Concrete })
	U.span(m, x0 - 1, x1 + 1, H, H + 1, z0 - 1, z1 + 1, 0x3a3f36, { material = M.Concrete })
	for z = 104, z1 - 8, 16 do
		U.span(m, x0 + 2, x1 - 2, H - 3.2, H, z - 0.4, z + 0.4, 0x6b6f66, { material = M.Concrete, decor = true })
	end
	for z = 100, z1, 16 do
		for _, x in { 50, 110 } do
			U.neon(m, Vector3.new(0.8, 0.2, 0.8), CFrame.new(x, H - 0.2, z), 0xffffff, z % 32 == 4 and { kind = "SurfaceLight", range = 26, brightness = 1 } or nil)
		end
	end
	for _, s in { { x0, x1, z0 - 0.5, z0 }, { x0 - 0.5, x0, z0, z1 }, { x1, x1 + 0.5, z0, z1 } } do
		U.span(m, s[1], s[2], H - 5, H - 3.8, s[3], s[4], 0xff7a3d, { decor = true })
	end
	U.signAt(m, "GUN RANGE", 28, 4.4, 80, H - 6.4, z0 - 0.3, 180, { bg = 0x14182b, fg = 0xff7a3d, glow = true, stroke = 0xff7a3d })
	U.span(m, 68, 92, 11, 11.8, z0 - 6, z0, 0x23262f, { decor = true })
	Kit.slab(m, x0, x1, 23, z0, Config.Curb + 0.12, 0xd4d7dc, M.Pavement, 0.5)

	-- lobby: counter + weapon wall + prompt
	U.box(m, 32, 2.3, 2.8, 80, FLOOR, 67, 0x3a2a1f, { material = M.WoodPlanks })
	U.box(m, 32.6, 0.16, 3.4, 80, FLOOR + 2.3, 67, 0xe8e8e8, { material = M.Marble, decor = true })
	U.span(m, x0, x1, 0, H, 79.6, 80.8, wall, { material = M.Concrete })
	U.span(m, 62, 98, FLOOR + 2, FLOOR + 10.4, 79.2, 79.6, 0x5a3b22, { material = M.WoodPlanks, decor = true })
	for i, id in Config.WeaponOrder do
		local gm = GunModel.build(id, false)
		gm:ScaleTo(2.2)
		gm:PivotTo(CFrame.new(66 + ((i - 1) % 3) * 14, FLOOR + 7.8 - math.floor((i - 1) / 3) * 3.2, 78.8) * CFrame.Angles(0, math.rad(90), 0))
		for _, d in gm:GetDescendants() do
			if d:IsA("BasePart") then
				d.Anchored = true
			end
		end
		gm.Parent = m
	end
	U.signAt(m, "Press E at the counter to pick a weapon", 20, 1.4, 80, FLOOR + 11.6, 79.1, 180, { bg = 0x14182b })
	local a = City.anchor(m, 80, FLOOR + 2, 61, "Counter")
	City.prompt(a, "range", "Pick a weapon", "Gun Range", 10)

	-- firing line: bench, lane dividers, lane numbers
	local line = R.line
	U.box(m, x1 - x0 - 4, 2.2, 1.6, (x0 + x1) / 2, FLOOR, line, 0x7a5234, { material = M.WoodPlanks })
	for i = 0, 6 do
		local x = x0 + 2 + i * 12.8
		U.box(m, 0.24, 5.2, 6, x, FLOOR, line - 2.4, 0xd8d8d8, { material = M.Concrete })
	end
	for i = 0, 5 do
		U.signAt(m, "LANE " .. (i + 1), 3.2, 1, x0 + 8.4 + i * 12.8, FLOOR + 1.2, line - 0.84, 180, { bg = 0xff7a3d, glow = true })
	end
	U.part(m, Vector3.new(x1 - x0 - 4, 12, 8), CFrame.new((x0 + x1) / 2, FLOOR + 2, z1 - 7) * CFrame.Angles(math.rad(-40), 0, 0), 0xb08a5a, { material = M.Sand })
	for _, z in { 116, 146, 176, 206 } do
		U.span(m, x0 + 2, x1 - 2, FLOOR + 0.02, FLOOR + 0.06, z - 0.2, z + 0.2, 0xffc83d, { decor = true, noShadow = true })
		U.sign(m, (z - line) .. " studs", 6, 1.2, CFrame.new(x0 + 6, FLOOR + 0.08, z + 1.2) * CFrame.Angles(math.rad(-90), 0, 0), { fg = 0xffc83d })
	end
	-- targets
	local tg = U.folder(m, "Targets")
	for i = 0, 5 do
		target(tg, "dummy", x0 + 8.4 + i * 12.8, 116 + (i % 2) * 12)
	end
	for i = 0, 4 do
		target(tg, "board", x0 + 14.8 + i * 12.8, 152, i % 2 == 1 and 4.4 or 0, 0.8 + i * 0.15)
	end
	for i = 0, 3 do
		target(tg, "dummy", x0 + 16 + i * 16, 184, 7, 0.6 + i * 0.2)
	end
	for i = 0, 2 do
		target(tg, "board", x0 + 20 + i * 20, 212, 0, 1)
	end
end

return GunRange
