--!nonstrict
-- Server entry point: builds the map (unless a pre-built one was saved into the
-- place), sets up lighting, remotes, saving, NPCs, race cars and weapons.
local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local Lighting = game:GetService("Lighting")
local PhysicsService = game:GetService("PhysicsService")
local DataStoreService = game:GetService("DataStoreService")
local CollectionService = game:GetService("CollectionService")

local Config = require(RS.Shared.Config)
local CarModel = require(RS.Shared.CarModel)
local GunModel = require(RS.Shared.GunModel)
local TrackPath = require(RS.Shared.TrackPath)
local Avatar = require(script.Parent.Avatar)
local Npcs = require(script.Parent.Npcs)
local World = script.Parent.World

-- -------------------------------------------------------------------- remotes
local Remotes = Instance.new("Folder")
Remotes.Name = "Remotes"
local function remote(class, name)
	local r = Instance.new(class)
	r.Name = name
	r.Parent = Remotes
	return r
end
local ApplyLook = remote("RemoteEvent", "ApplyLook")
local GetProfile = remote("RemoteFunction", "GetProfile")
local SaveProfile = remote("RemoteEvent", "SaveProfile")
local StartRace = remote("RemoteFunction", "StartRace")
local EndRace = remote("RemoteEvent", "EndRace")
local RangeEquip = remote("RemoteEvent", "RangeEquip")
Remotes.Parent = RS

-- ------------------------------------------------------------------- lighting
local function fx(class, props)
	local o = Lighting:FindFirstChildOfClass(class) or Instance.new(class)
	for k, v in props do
		o[k] = v
	end
	o.Parent = Lighting
	return o
end
fx("Atmosphere", { Density = 0.28, Offset = 0.15, Color = Color3.fromRGB(199, 225, 255), Decay = Color3.fromRGB(106, 140, 170), Glare = 0.2, Haze = 1.2 })
fx("Sky", { SunAngularSize = 14, MoonAngularSize = 9 })
fx("BloomEffect", { Intensity = 0.6, Size = 30, Threshold = 1.6 })
fx("ColorCorrectionEffect", { Saturation = 0.12, Contrast = 0.06, Brightness = 0.02 })
fx("SunRaysEffect", { Intensity = 0.04, Spread = 0.7 })
local clouds = workspace.Terrain:FindFirstChildOfClass("Clouds") or Instance.new("Clouds")
clouds.Cover = 0.55
clouds.Density = 0.6
clouds.Parent = workspace.Terrain

-- ------------------------------------------------------------ collision groups
PhysicsService:RegisterCollisionGroup("Players")
PhysicsService:RegisterCollisionGroup("Townsfolk")
PhysicsService:CollisionGroupSetCollidable("Players", "Townsfolk", false)
PhysicsService:CollisionGroupSetCollidable("Townsfolk", "Townsfolk", false)
-- a racing car and its driver are moved by the driver's client and collide with nothing
PhysicsService:RegisterCollisionGroup("Racing")
for _, g in { "Default", "Players", "Townsfolk", "Racing" } do
	PhysicsService:CollisionGroupSetCollidable("Racing", g, false)
end

-- ------------------------------------------------------------------ the world
-- terrain (ground, water, the raceway surface) is voxel data: painted at start-up
if not workspace.Terrain:GetAttribute("MW_Painted") then
	require(World.City).terrain()
	require(World.Track).terrain()
	workspace.Terrain:SetAttribute("MW_Painted", true)
end

-- the map normally ships pre-built in the place file (see tools/build-map.luau);
-- if it is missing (e.g. a plain Rojo sync), build it now
local map = workspace:FindFirstChild("Map")
if not map then
	local t0 = os.clock()
	map = Instance.new("Model")
	map.Name = "Map"
	-- build while detached from the workspace (much faster), then parent once
	require(World.City).build(map)
	require(World.Mall).build(map)
	require(World.Garage).build(map)
	require(World.Office).build(map)
	require(World.GunRange).build(map)
	require(World.Track).build(map)
	map.Parent = workspace
	local parts = 0
	for _, d in map:GetDescendants() do
		if d:IsA("BasePart") then
			parts += 1
		end
	end
	print(("Mingalar World built in %.1fs (%d parts)"):format(os.clock() - t0, parts))
end
-- interiors and far-away areas stream as whole models
for _, name in { "OfficeInterior", "VirtualMall", "Garage", "GunRange" } do
	local m = map:FindFirstChild(name, true)
	if m and m:IsA("Model") then
		m.ModelStreamingMode = Enum.ModelStreamingMode.Default
	end
end

local spawn = Instance.new("SpawnLocation")
spawn.Size = Vector3.new(12, 1, 12)
spawn.Position = Config.Spawn - Vector3.new(0, 3.4, 0)
spawn.Anchored = true
spawn.Transparency = 1
spawn.CanCollide = false
spawn.Duration = 0
spawn.Parent = workspace

Npcs.spawn(workspace, 6)

-- ------------------------------------------------------------ day and night
-- A full day takes 24 minutes; street lights switch on at dusk.
task.spawn(function()
	local lightsOn = nil
	while true do
		Lighting.ClockTime = (Lighting.ClockTime + 1 / 60) % 24
		local night = Lighting.ClockTime > 18.2 or Lighting.ClockTime < 6.2
		if night ~= lightsOn then
			lightsOn = night
			for _, l in CollectionService:GetTagged("StreetLight") do
				l.Brightness = night and 2 or 0
			end
		end
		task.wait(1)
	end
end)

-- -------------------------------------------------------------------- saving
local store = nil
pcall(function()
	store = DataStoreService:GetDataStore("MingalarWorld_v1")
end)
local profiles = {}
local dirty = {}

local function blankProfile()
	return { look = table.clone(Config.Avatar.Default), mods = {}, laps = {}, range = {} }
end

local function load(player)
	local data = nil
	if store then
		local ok, res = pcall(function()
			return store:GetAsync("u" .. player.UserId)
		end)
		if ok then
			data = res
		end
	end
	local p = blankProfile()
	if typeof(data) == "table" then
		p.look = Avatar.sanitize(data.look)
		p.mods = typeof(data.mods) == "table" and data.mods or {}
		p.laps = typeof(data.laps) == "table" and data.laps or {}
		p.range = typeof(data.range) == "table" and data.range or {}
	end
	profiles[player] = p
	return p
end

local function save(player)
	local p = profiles[player]
	if not (store and p and dirty[player]) then
		return
	end
	dirty[player] = nil
	pcall(function()
		store:SetAsync("u" .. player.UserId, p)
	end)
end

-- sanitise car mods coming from a client
local modKeys = {}
for k, list in Config.ModOptions do
	modKeys[k] = {}
	for _, o in list do
		modKeys[k][o[1]] = true
	end
end
local function cleanMods(kind, mods)
	local out = Config.defaultMods(kind)
	if typeof(mods) ~= "table" then
		return out
	end
	for k, v in mods do
		if modKeys[k] and modKeys[k][v] then
			out[k] = v
		elseif (k == "paint" or k == "rim" or k == "stripeColor") and typeof(v) == "number" and v >= 0 and v <= 0xffffff then
			out[k] = math.floor(v)
		elseif k == "nitro" and typeof(v) == "boolean" then
			out[k] = v
		end
	end
	return out
end

GetProfile.OnServerInvoke = function(player)
	return profiles[player] or load(player)
end

SaveProfile.OnServerEvent:Connect(function(player, key, sub, value)
	local p = profiles[player]
	if not p or typeof(sub) ~= "string" or #sub > 20 then
		return
	end
	if key == "mods" and Config.Cars[sub] then
		p.mods[sub] = cleanMods(sub, value)
	elseif key == "laps" and Config.Cars[sub] and typeof(value) == "number" and value > 5 then
		p.laps[sub] = math.min(p.laps[sub] or math.huge, value)
	elseif key == "range" and Config.Weapons[sub] and typeof(value) == "number" and value >= 0 and value < 100000 then
		p.range[sub] = math.max(p.range[sub] or 0, math.floor(value))
	else
		return
	end
	dirty[player] = true
end)

-- ---------------------------------------------------------------- appearance
local lastLook = {}
local function applySaved(player, char)
	local p = profiles[player] or load(player)
	Avatar.applyToCharacter(char, p.look)
	for _, d in char:GetDescendants() do
		if d:IsA("BasePart") then
			d.CollisionGroup = "Players"
		end
	end
end

ApplyLook.OnServerEvent:Connect(function(player, look)
	-- light rate limit: ApplyDescription is not free
	local now = os.clock()
	if lastLook[player] and now - lastLook[player] < 0.25 then
		return
	end
	lastLook[player] = now
	local p = profiles[player]
	if not p then
		return
	end
	p.look = Avatar.sanitize(look)
	dirty[player] = true
	if player.Character then
		applySaved(player, player.Character)
	end
end)

-- -------------------------------------------------------------------- racing
local cars = {}

local function setGroup(model, group)
	for _, d in model:GetDescendants() do
		if d:IsA("BasePart") then
			d.CollisionGroup = group
		end
	end
end

local function endRace(player)
	local car = cars[player]
	cars[player] = nil
	if car then
		car:Destroy()
	end
	if player.Character then
		setGroup(player.Character, "Players")
	end
end

StartRace.OnServerInvoke = function(player, kind, mods)
	if not Config.Cars[kind] then
		return nil
	end
	local char = player.Character
	local hum = char and char:FindFirstChildOfClass("Humanoid")
	if not hum then
		return nil
	end
	endRace(player)
	mods = cleanMods(kind, mods)
	local built = CarModel.build(kind, mods, { anchored = false })
	local model, root = built.model, built.root
	root.Size = Vector3.new(4, 1, 8)
	root.Massless = false
	-- wheels hang off Motor6Ds so the driver's client can spin and steer them
	for i, w in built.wheels do
		local tire = w.model.PrimaryPart
		for _, p in w.model:GetDescendants() do
			if p:IsA("BasePart") and p ~= tire then
				local wc = Instance.new("WeldConstraint")
				wc.Part0, wc.Part1 = tire, p
				wc.Parent = p
			end
		end
		local motor = Instance.new("Motor6D")
		motor.Name = "Wheel" .. i
		motor.Part0 = root
		motor.Part1 = tire
		motor.C0 = root.CFrame:ToObjectSpace(tire.CFrame)
		motor.Parent = root
		motor:SetAttribute("Front", w.front)
		motor:SetAttribute("Side", w.side)
	end
	-- everything else is welded to the root
	local wheelModels = {}
	for _, w in built.wheels do
		wheelModels[w.model] = true
	end
	for _, p in model:GetDescendants() do
		if p:IsA("BasePart") then
			local inWheel = wheelModels[p.Parent] ~= nil
			if p ~= root and not inWheel then
				local wc = Instance.new("WeldConstraint")
				wc.Part0, wc.Part1 = root, p
				wc.Parent = p
			end
			p.Massless = p ~= root
			p.CanCollide = false
		end
	end
	local seat = Instance.new("Seat")
	seat.Name = "DriverSeat"
	seat.Size = Vector3.new(1.4, 0.4, 1.4)
	seat.Transparency = 1
	seat.CanCollide = false
	seat.Massless = true
	seat.CFrame = root.CFrame * CFrame.new(built.eye.X, built.eye.Y - 2.6, built.eye.Z + 0.4)
	seat.Parent = model
	local sw = Instance.new("WeldConstraint")
	sw.Part0, sw.Part1 = root, seat
	sw.Parent = seat
	model:SetAttribute("Kind", kind)
	model:SetAttribute("Eye", built.eye)
	model:SetAttribute("Radius", built.r)
	-- grid slot 4 (back of the grid)
	local tr = TrackPath.get()
	local idx = (tr.N - 16) % tr.N + 1
	local pos = tr.pts[idx] + tr.R[idx] * 8
	model:PivotTo(CFrame.lookAt(pos, pos + tr.T[idx]))
	for _, p in model:GetDescendants() do
		if p:IsA("BasePart") then
			p.Anchored = false
		end
	end
	model.Name = player.Name .. "_Car"
	setGroup(model, "Racing")
	setGroup(char, "Racing")
	model.Parent = workspace
	root:SetNetworkOwner(player)
	cars[player] = model
	seat:Sit(hum)
	return model
end

EndRace.OnServerEvent:Connect(function(player)
	endRace(player)
	local char = player.Character
	if char then
		local hum = char:FindFirstChildOfClass("Humanoid")
		if hum then
			hum.Sit = false
		end
		char:PivotTo(CFrame.new(-170, 5, 60) * CFrame.Angles(0, math.pi, 0))
	end
end)

-- -------------------------------------------------------------------- weapons
RangeEquip.OnServerEvent:Connect(function(player, weaponId)
	local char = player.Character
	local hum = char and char:FindFirstChildOfClass("Humanoid")
	if not hum then
		return
	end
	for _, c in { char, player.Backpack } do
		for _, t in c:GetChildren() do
			if t:IsA("Tool") and t:GetAttribute("RangeGun") then
				t:Destroy()
			end
		end
	end
	if weaponId and Config.Weapons[weaponId] then
		local tool = GunModel.build(weaponId, true)
		tool:SetAttribute("RangeGun", true)
		tool.ToolTip = Config.Weapons[weaponId].name
		tool.Parent = player.Backpack
		hum:EquipTool(tool)
	end
end)

-- -------------------------------------------------------------------- players
local function onPlayer(player)
	load(player)
	player.CharacterAppearanceLoaded:Connect(function(char)
		applySaved(player, char)
	end)
	if player.Character then
		applySaved(player, player.Character)
	end
end
Players.PlayerAdded:Connect(onPlayer)
for _, p in Players:GetPlayers() do
	task.spawn(onPlayer, p)
end
Players.PlayerRemoving:Connect(function(player)
	endRace(player)
	save(player)
	profiles[player], dirty[player], lastLook[player] = nil, nil, nil
end)
game:BindToClose(function()
	for _, p in Players:GetPlayers() do
		save(p)
	end
end)
task.spawn(function()
	while true do
		task.wait(120)
		for _, p in Players:GetPlayers() do
			save(p)
		end
	end
end)
