--!nonstrict
-- Client entry point: loads the profile, builds the HUD and routes every
-- ProximityPrompt in the map (by its "Action" attribute) to the right feature.
local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local ProximityPromptService = game:GetService("ProximityPromptService")

local UI = require(script.Parent.UI)
local Cam = require(script.Parent.CameraController)
local Minimap = require(script.Parent.Minimap)
local Customize = require(script.Parent.Customize)
local Shop = require(script.Parent.Shop)
local Garage = require(script.Parent.GarageClient)
local Race = require(script.Parent.Race)
local Range = require(script.Parent.Range)
local Golf = require(script.Parent.Golf)
local A = require(script.Parent.Activities)

local player = Players.LocalPlayer
local Remotes = RS:WaitForChild("Remotes")
local state = { remotes = {}, profile = nil }
for _, r in Remotes:GetChildren() do
	state.remotes[r.Name] = r
end

-- profile (look, car mods, best laps, range scores)
for _ = 1, 5 do
	local ok, p = pcall(function()
		return state.remotes.GetProfile:InvokeServer()
	end)
	if ok and p then
		state.profile = p
		break
	end
	task.wait(1)
end
state.profile = state.profile or { look = {}, mods = {}, laps = {}, range = {} }

-- ------------------------------------------------------------------ HUD
Minimap.init()
Shop.init(state)
Garage.init(state)
Range.init(state)
A.ambient()

local function busy()
	return Race.active() or Range.active() or Golf.active() or Cam.owned()
end

local viewBtn
local function refreshView()
	if viewBtn then
		viewBtn.Text = Cam.view == "first" and "👁 1st person" or "🎥 3rd person"
	end
end
UI.topButton("👕 Avatar", 2, function()
	if UI.panelId() == "customize" then
		UI.closePanel()
	elseif not busy() then
		Customize.open(state)
	end
end)
viewBtn = UI.topButton("🎥 3rd person", 3, function()
	if not busy() then
		Cam.toggle()
		refreshView()
	end
end)
Cam.onChange(refreshView)

local HELP = table.concat({
	"<b>Move</b> WASD · <b>Jump</b> Space",
	"<b>Interact</b> E at the prompts · <b>Camera</b> right-drag (3rd person) or V for 1st person",
	"<b>Avatar</b> C · <b>Map</b> M · <b>Leave an activity</b> Q",
	"",
	"<b>Places</b>: Virtual Mall (Tech & Fashion) · Virtual Garage & Raceway · Virtual Office · Gun Range · Luxury Home & Pool · Mini Golf · Gym",
}, "\n")
UI.topButton("?", 4, function()
	if UI.panelId() == "help" then
		UI.closePanel()
		return
	end
	local b = UI.openPanel({ id = "help", kicker = "Mingalar World", title = "How to play" })
	UI.text(b, HELP, 15, Color3.new(1, 1, 1), UI.Body)
end)

-- hotkeys
UserInputService.InputBegan:Connect(function(input, gp)
	if gp then
		return
	end
	if input.KeyCode == Enum.KeyCode.V and not busy() then
		Cam.toggle()
		refreshView()
	elseif input.KeyCode == Enum.KeyCode.C and not busy() then
		if UI.panelId() == "customize" then
			UI.closePanel()
		else
			Customize.open(state)
		end
	elseif input.KeyCode == Enum.KeyCode.M then
		Minimap.toggle()
	end
end)

-- -------------------------------------------------------------- prompts
local openPrompt = nil
ProximityPromptService.PromptTriggered:Connect(function(prompt, who)
	if who ~= player or busy() then
		return
	end
	local action = prompt:GetAttribute("Action")
	if not action then
		return
	end
	if UI.panelId() == action then
		UI.closePanel()
		return
	end
	openPrompt = prompt
	local kind, arg = string.match(action, "^([%w%-]+):?(.*)$")
	if kind == "mall" then
		Shop.openDisplay(arg)
	elseif kind == "car" then
		Garage.open(arg, function(k, mods)
			Race.start(state, k, mods)
		end)
	elseif kind == "link" then
		A.openLink(arg)
	elseif action == "office-enter" then
		A.enterOffice()
	elseif action == "office-exit" then
		A.exitOffice()
	elseif action == "office-reception" then
		A.reception()
	elseif action == "range" then
		Range.openPicker()
	elseif action == "golf" then
		Golf.start()
	elseif action == "gym" then
		A.workout()
	elseif action == "home" then
		A.homeGallery()
	end
end)

-- walking away from a display closes its panel; prompts hide during activities
task.spawn(function()
	while true do
		task.wait(0.3)
		ProximityPromptService.Enabled = not busy()
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if root and openPrompt and openPrompt.Parent and UI.panelId() == openPrompt:GetAttribute("Action") then
			local part = openPrompt.Parent
			if part:IsA("BasePart") and (part.Position - root.Position).Magnitude > openPrompt.MaxActivationDistance + 8 then
				UI.closePanel()
			end
		end
	end
end)

Cam.apply()
task.delay(2, function()
	UI.toast("Welcome to Mingalar World! Walk up to a building and press E.", 4)
end)
