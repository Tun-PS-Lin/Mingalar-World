--!nonstrict
-- Minimap (bottom left): a north-up map that follows the player, with a
-- facing arrow, labels, race rivals and a minimise button. The map is a set
-- of Frames built once; each frame only its offset changes.
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local RS = game:GetService("ReplicatedStorage")
local Config = require(RS.Shared.Config)
local TrackPath = require(RS.Shared.TrackPath)
local UI = require(script.Parent.UI)

local Minimap = {}
-- set by the race: functions returning the focus CFrame and marker list
Minimap.focus = nil :: (() -> CFrame)?
Minimap.markers = nil :: (() -> { any })?
Minimap.toggle = function() end
local player = Players.LocalPlayer
local SIZE = UI.touch and 140 or 200
local SCALE = 0.7 -- pixels per stud
local markers = {}

local function hex(h)
	return Color3.fromRGB(bit32.rshift(h, 16), bit32.band(bit32.rshift(h, 8), 255), bit32.band(h, 255))
end

-- what to draw: { x0, x1, z0, z1, colour, label? }
local function cityShapes()
	local s = {}
	local function r(x0, x1, z0, z1, c, label)
		table.insert(s, { x0, x1, z0, z1, c, label })
	end
	local C = Config
	r(-340, 340, -300, 300, 0x5b6068)
	for _, b in { { -292, -14, -252, -14 }, { 14, 292, -252, -14 }, { -292, -14, 14, 252 }, { 14, 292, 14, 252 } } do
		r(b[1], b[2], b[3], b[4], 0xc9ccd0)
		r(b[1] + 9, b[2] - 9, b[3] + 9, b[4] - 9, 0x86cf63)
	end
	r(-0.8, 0.8, -252, 252, 0xe8c454)
	r(-292, 292, -0.8, 0.8, 0xe8c454)
	r(C.Mall.x0, C.Mall.x1, C.Mall.z0, C.Mall.z1, 0xe7e1d8, "Mall")
	r(C.Mall.x0 + 2, C.Mall.x1 - 2, C.Mall.z0 + 2, -166, 0x8fa6c9)
	r(C.Mall.x0 + 2, C.Mall.x1 - 2, -138, C.Mall.z1 - 2, 0xf0c0d0)
	r(C.Garage.x0, C.Garage.x1, C.Garage.z0, C.Garage.z1, 0x3a3e46, "Garage")
	r(C.Office.x0, C.Office.x1, C.Office.z0, C.Office.z1, 0x4f8fc4, "Office")
	r(C.Range.x0, C.Range.x1, C.Range.z0, C.Range.z1, 0x4d5446, "Gun Range")
	r(C.Home.x0, C.Home.x1, C.Home.z0, C.Home.z1, 0xf1ede4, "Home")
	r(C.Pool.x0, C.Pool.x1, C.Pool.z0, C.Pool.z1, 0x2bb3e6, "Pool")
	r(C.Gym.x0, C.Gym.x1, C.Gym.z0, C.Gym.z1, 0x3c4350, "Gym")
	r(C.Golf.x0, C.Golf.x1, C.Golf.z0 - 4, C.Golf.z1 - 4, 0x4f9a3a, "Golf")
	r(-192, -128, -68, -28, 0xd9cfbd, "Fountain")
	r(138, 174, 121, 143, 0x3fb8e0, "Pond")
	r(-264, -112, 152, 240, 0x4a4f57, "Parking")
	for _, w in { { -343, 343, -303, -300 }, { -343, 343, 300, 303 }, { -343, -340, -300, 300 }, { 340, 343, -300, 300 } } do
		r(w[1], w[2], w[3], w[4], 0xa0503a)
	end
	return s
end

local function interiorShapes()
	local I = Config.OfficeInterior
	local X, Z = I.x, I.z
	return {
		{ X - 66, X + 66, Z - 48, Z + 48, 0xe9e2d6, nil },
		{ X - 16, X + 16, Z - 44, Z + 44, 0x4a5263, nil },
		{ X - 58, X - 18, Z - 45, Z - 14, 0x1d2b45, "Alacrity" },
		{ X + 18, X + 62, Z - 45, Z - 12, 0x5a1422, "News" },
		{ X + 18, X + 62, Z + 12, Z + 45, 0x161b22, "GitHub" },
		{ X - 58, X - 18, Z + 14, Z + 45, 0xd9cbb4, "Lounge" },
		{ X - 64, X - 60, Z - 4, Z + 4, 0x2fa37a, "Exit" },
	}
end

local function build(parent, shapes, bounds, track)
	local world = Instance.new("Frame")
	world.BackgroundColor3 = hex(0x7cc55a)
	world.BorderSizePixel = 0
	world.Size = UDim2.fromOffset((bounds[2] - bounds[1]) * SCALE, (bounds[4] - bounds[3]) * SCALE)
	world.Parent = parent
	local function px(x, z)
		return (x - bounds[1]) * SCALE, (z - bounds[3]) * SCALE
	end
	if track then
		local tr = TrackPath.get()
		for i = 1, tr.N, 3 do
			local a, b = tr.pts[i], tr.pts[(i + 2) % tr.N + 1]
			local ax, az = px(a.X, a.Z)
			local bx, bz = px(b.X, b.Z)
			local f = Instance.new("Frame")
			f.BorderSizePixel = 0
			f.BackgroundColor3 = hex(0x3c4047)
			f.AnchorPoint = Vector2.new(0.5, 0.5)
			f.Position = UDim2.fromOffset((ax + bx) / 2, (az + bz) / 2)
			f.Size = UDim2.fromOffset(math.sqrt((bx - ax) ^ 2 + (bz - az) ^ 2) + 2, tr.width * SCALE)
			f.Rotation = math.deg(math.atan2(bz - az, bx - ax))
			f.Parent = world
		end
	end
	for _, s in shapes do
		local x0, z0 = px(s[1], s[3])
		local f = Instance.new("Frame")
		f.BorderSizePixel = 0
		f.BackgroundColor3 = hex(s[5])
		f.Position = UDim2.fromOffset(x0, z0)
		f.Size = UDim2.fromOffset((s[2] - s[1]) * SCALE, (s[4] - s[3]) * SCALE)
		f.Parent = world
		if s[6] then
			local t = Instance.new("TextLabel")
			t.BackgroundTransparency = 1
			t.AnchorPoint = Vector2.new(0.5, 0.5)
			t.Position = UDim2.fromScale(0.5, 0.5)
			t.Size = UDim2.fromOffset(90, 14)
			t.Text = s[6]
			t.Font = UI.Font
			t.TextSize = 11
			t.TextColor3 = Color3.new(1, 1, 1)
			t.TextStrokeTransparency = 0.3
			t.ZIndex = 3
			t.Parent = f
		end
	end
	return world, bounds
end

function Minimap.init()
	local holder = Instance.new("Frame")
	holder.BackgroundTransparency = 1
	holder.AnchorPoint = Vector2.new(0, 1)
	holder.Position = UDim2.new(0, 14, 1, -14)
	holder.Size = UDim2.fromOffset(SIZE, SIZE)
	holder.Parent = UI.gui

	local map = Instance.new("CanvasGroup")
	map.Size = UDim2.fromScale(1, 1)
	map.BackgroundColor3 = hex(0x7cc55a)
	map.Parent = holder
	UI.corner(map, 18)
	local stroke = UI.stroke(holder, Color3.new(1, 1, 1), 3)
	stroke.Transparency = 0.1
	UI.corner(holder, 18)

	local city, cityB = build(map, cityShapes(), { -560, 560, -480, 480 }, true)
	local I = Config.OfficeInterior
	local inside, insideB = build(map, interiorShapes(), { I.x - 80, I.x + 80, I.z - 60, I.z + 60 }, false)
	inside.BackgroundColor3 = hex(0x2a2d33)

	local markerLayer = Instance.new("Frame")
	markerLayer.BackgroundTransparency = 1
	markerLayer.Size = UDim2.fromScale(1, 1)
	markerLayer.ZIndex = 5
	markerLayer.Parent = map

	local arrow = Instance.new("TextLabel")
	arrow.BackgroundTransparency = 1
	arrow.AnchorPoint = Vector2.new(0.5, 0.5)
	arrow.Position = UDim2.fromScale(0.5, 0.5)
	arrow.Size = UDim2.fromOffset(22, 22)
	arrow.Text = "▲"
	arrow.TextScaled = true
	arrow.TextColor3 = UI.Accent
	arrow.TextStrokeTransparency = 0
	arrow.ZIndex = 6
	arrow.Parent = map
	local north = Instance.new("TextLabel")
	north.BackgroundTransparency = 1
	north.AnchorPoint = Vector2.new(0.5, 0)
	north.Position = UDim2.new(0.5, 0, 0, 4)
	north.Size = UDim2.fromOffset(20, 14)
	north.Text = "N"
	north.Font = UI.Font
	north.TextSize = 13
	north.TextColor3 = Color3.new(1, 1, 1)
	north.TextStrokeTransparency = 0.3
	north.ZIndex = 6
	north.Parent = map

	local minimise = UI.button(holder, "–", nil, { size = UDim2.fromOffset(28, 28), ghost = true, radius = 8 })
	minimise.Position = UDim2.new(1, -34, 0, 6)
	minimise.BackgroundColor3 = UI.Glass
	minimise.BackgroundTransparency = 0.2
	minimise.TextColor3 = Color3.new(1, 1, 1)
	minimise.ZIndex = 8
	local open = UI.button(UI.gui, "🗺️", nil, { size = UDim2.fromOffset(50, 50), ghost = true, radius = 25 })
	open.AnchorPoint = Vector2.new(0, 1)
	open.Position = UDim2.new(0, 14, 1, -14)
	open.BackgroundColor3 = UI.Glass
	open.BackgroundTransparency = 0.15
	open.TextSize = 24
	open.Visible = false
	local function setMin(v)
		holder.Visible = not v
		open.Visible = v
	end
	minimise.Activated:Connect(function()
		setMin(true)
	end)
	open.Activated:Connect(function()
		setMin(false)
	end)
	Minimap.toggle = function()
		setMin(holder.Visible)
	end

	local acc = 0
	RunService.RenderStepped:Connect(function(dt)
		acc += dt
		if acc < 1 / 20 or not holder.Visible then
			return
		end
		acc = 0
		local focus = Minimap.focus and Minimap.focus()
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		local cf = focus or (root and root.CFrame)
		if not cf then
			return
		end
		local p = cf.Position
		local inOffice = p.X > I.x - 100
		city.Visible = not inOffice
		inside.Visible = inOffice
		local world, b = city, cityB
		if inOffice then
			world, b = inside, insideB
		end
		world.Position = UDim2.fromOffset(SIZE / 2 - (p.X - b[1]) * SCALE, SIZE / 2 - (p.Z - b[3]) * SCALE)
		local look = cf.LookVector
		arrow.Rotation = math.deg(math.atan2(look.X, -look.Z))
		-- markers (race rivals)
		local list = Minimap.markers and Minimap.markers() or {}
		for i, mk in list do
			local f = markers[i]
			if not f then
				f = Instance.new("Frame")
				f.Size = UDim2.fromOffset(8, 8)
				f.AnchorPoint = Vector2.new(0.5, 0.5)
				f.BorderSizePixel = 0
				UI.corner(f, 4)
				f.Parent = markerLayer
				markers[i] = f
			end
			f.Visible = true
			f.BackgroundColor3 = mk.color
			f.Position = UDim2.fromOffset(SIZE / 2 + (mk.x - p.X) * SCALE, SIZE / 2 + (mk.z - p.Z) * SCALE)
		end
		for i = #list + 1, #markers do
			markers[i].Visible = false
		end
	end)
end

return Minimap
