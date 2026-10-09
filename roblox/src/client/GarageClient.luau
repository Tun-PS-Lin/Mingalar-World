--!nonstrict
-- Showroom cars (built locally with this player's mods, spinning on their
-- turntables) and the mod shop panel.
local RS = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Config = require(RS.Shared.Config)
local CarModel = require(RS.Shared.CarModel)
local UI = require(script.Parent.UI)

local Garage = {}
local showroom = {} -- kind -> { car, base, angle }
local selected = nil

local function modsFor(state, kind)
	local m = Config.defaultMods(kind)
	for k, v in state.profile.mods[kind] or {} do
		m[k] = v
	end
	return m
end
Garage.modsFor = modsFor

local function rebuild(state, kind)
	local entry = showroom[kind]
	if not entry then
		return
	end
	if entry.car then
		entry.car.model:Destroy()
	end
	entry.car = CarModel.build(kind, modsFor(state, kind), { parent = workspace:FindFirstChild("Showroom") })
end

function Garage.init(state)
	Garage.state = state
	local folder = Instance.new("Folder")
	folder.Name = "Showroom"
	folder.Parent = workspace
	-- turntables stream in with the map; build a car on each as it arrives
	task.spawn(function()
		local map = workspace:WaitForChild("Map")
		local tt = map:WaitForChild("Garage"):WaitForChild("Turntables")
		local function add(disc)
			local kind = disc:GetAttribute("Kind")
			if not kind or showroom[kind] then
				return
			end
			showroom[kind] = { base = disc.Position + Vector3.new(0, disc.Size.X / 2, 0), angle = math.random() * 6 }
			rebuild(state, kind)
		end
		for _, d in tt:GetChildren() do
			add(d)
		end
		tt.ChildAdded:Connect(add)
	end)
	local acc = 0
	RunService.Heartbeat:Connect(function(dt)
		acc += dt
		if acc < 1 / 30 then
			return
		end
		local step = acc
		acc = 0
		local cam = workspace.CurrentCamera.CFrame.Position
		for kind, e in showroom do
			if e.car and (cam - e.base).Magnitude < 260 then
				e.angle += step * (selected == kind and 0.9 or 0.2)
				CarModel.place(e.car, CFrame.new(e.base) * CFrame.Angles(0, e.angle, 0), 0, 0)
			end
		end
	end)
end

local function bar(parent, label, v, max)
	local row = Instance.new("Frame")
	row.BackgroundTransparency = 1
	row.Size = UDim2.new(1, 0, 0, 18)
	row.Parent = parent
	local t = UI.text(row, label, 13, Color3.new(1, 1, 1), UI.Body)
	t.Size = UDim2.new(0, 100, 1, 0)
	t.AutomaticSize = Enum.AutomaticSize.None
	local track = UI.frame(row, UDim2.new(1, -110, 0, 8), UDim2.new(0, 110, 0.5, -4), Color3.new(1, 1, 1), 0.85)
	UI.corner(track, 4)
	local fill = UI.frame(track, UDim2.fromScale(math.clamp(v / max, 0, 1), 1), nil, Color3.fromRGB(91, 226, 138), 0)
	UI.corner(fill, 4)
end

--- Open the mod shop for one car; onRace(kind, mods) starts a race.
function Garage.open(kind, onRace)
	local state = Garage.state
	selected = kind
	local spec = Config.Cars[kind]
	local O = Config.ModOptions
	local function save(mods)
		state.profile.mods[kind] = mods
		state.remotes.SaveProfile:FireServer("mods", kind, mods)
		rebuild(state, kind)
	end
	local function render()
		local mods = modsFor(state, kind)
		local b = UI.clearPanel()
		local st = Config.carStats(kind, mods)
		local stats = UI.frame(b, UDim2.new(1, 0, 0, 0), nil, Color3.new(1, 1, 1), 0.94)
		stats.AutomaticSize = Enum.AutomaticSize.Y
		UI.corner(stats, 12)
		UI.pad(stats, 10)
		UI.list(stats, 6)
		bar(stats, "Top speed", st.top, 190)
		bar(stats, "Acceleration", st.accel, 68)
		bar(stats, "Grip", st.grip, 1.45)
		UI.text(stats, ("%d km/h top speed%s"):format(math.floor(st.top * 1.8), st.nitro and " · Nitro fitted" or ""), 12, Color3.fromRGB(200, 205, 215), UI.Body)
		UI.button(b, "🏁 Race this car", function()
			UI.closePanel()
			onRace(kind, mods)
		end, { height = 46, textSize = 18 })
		local function opt(key, label)
			UI.label(b, label)
			UI.options(b, O[key], mods[key], function(v)
				mods[key] = v
				save(mods)
				render()
			end)
		end
		local function sw(key, label, list)
			UI.label(b, label)
			UI.swatches(b, list, mods[key], function(v)
				mods[key] = v
				save(mods)
				render()
			end)
		end
		sw("paint", "Paint", Config.Paints)
		opt("finish", "Finish")
		opt("wheels", "Wheels")
		sw("rim", "Rim colour", Config.Rims)
		opt("spoiler", "Spoiler")
		opt("kit", "Body kit")
		opt("underglow", "Underglow")
		opt("stripes", "Stripes")
		if mods.stripes ~= "none" then
			sw("stripeColor", "Stripe colour", Config.Paints)
		end
		opt("engine", "Engine")
		opt("tires", "Tyres")
		UI.label(b, "Nitro")
		UI.options(b, { { false, "None" }, { true, "Nitro boost (Shift)" } }, mods.nitro, function(v)
			mods.nitro = v
			save(mods)
			render()
		end)
		UI.button(b, "Reset to factory", function()
			save(Config.defaultMods(kind))
			render()
		end, { ghost = true })
	end
	UI.openPanel({
		id = "car:" .. kind, kicker = "Virtual Garage · Mod shop", title = spec.name,
		onClose = function()
			if selected == kind then
				selected = nil
			end
		end,
	})
	render()
end

return Garage
