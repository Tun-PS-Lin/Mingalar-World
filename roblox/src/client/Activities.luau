--!nonstrict
-- Smaller interactions (office door and corners, reception, home gallery,
-- gym workout) and the ambient animation of tagged parts, all on the client.
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local CollectionService = game:GetService("CollectionService")
local RS = game:GetService("ReplicatedStorage")
local Config = require(RS.Shared.Config)
local UI = require(script.Parent.UI)

local A = {}
local player = Players.LocalPlayer

local function root()
	return player.Character and player.Character:FindFirstChild("HumanoidRootPart")
end
local function teleport(pos: Vector3, facing: Vector3)
	local r = root()
	if r then
		r.CFrame = CFrame.lookAt(pos, pos + facing)
		r.AssemblyLinearVelocity = Vector3.zero
	end
end

-- ------------------------------------------------------------------ office
function A.enterOffice()
	local I = Config.OfficeInterior
	UI.fade(function()
		-- stream the interior in before we arrive
		pcall(function()
			player:RequestStreamAroundAsync(Vector3.new(I.x, 4, I.z), 3)
		end)
		teleport(Vector3.new(I.x - I.w / 2 + 9, 4, I.z), Vector3.new(1, 0, 0))
	end)
	UI.toast("Welcome to the Virtual Office", 1.8)
end

function A.exitOffice()
	UI.fade(function()
		pcall(function()
			player:RequestStreamAroundAsync(Vector3.new(30, 4, -144), 3)
		end)
		teleport(Vector3.new(30, 4, -144), Vector3.new(-1, 0, 0))
	end)
end

function A.openLink(id)
	local l = Config.Links[id]
	local b = UI.openPanel({ id = "link:" .. id, kicker = "Virtual Office · " .. l.kicker, title = l.title })
	UI.text(b, l.text, 15, Color3.fromRGB(215, 220, 230), UI.Body)
	if Config.ShowExternalUrls then
		-- Roblox can't open web pages; show the address so it can be copied
		UI.label(b, "Website")
		local box = Instance.new("TextBox")
		box.Text = "https://" .. l.url
		box.ClearTextOnFocus = false
		box.TextEditable = false
		box.Font = UI.Font
		box.TextSize = 16
		box.TextColor3 = Color3.new(1, 1, 1)
		box.BackgroundColor3 = Color3.new(1, 1, 1)
		box.BackgroundTransparency = 0.9
		box.Size = UDim2.new(1, 0, 0, 40)
		UI.corner(box, 10)
		box.Parent = b
		UI.text(b, "Select the address to copy it. Roblox experiences can't open web pages directly.", 12, Color3.fromRGB(190, 195, 210), UI.Body)
	else
		UI.text(b, "Find " .. l.title .. " on the experience's page.", 13, Color3.fromRGB(190, 195, 210), UI.Body)
	end
end

function A.reception()
	local b = UI.openPanel({ id = "office-reception", kicker = "Virtual Office", title = "Reception" })
	UI.text(b, "Welcome! Three teams work on this floor:", 15, Color3.fromRGB(215, 220, 230), UI.Body)
	for _, line in {
		"🗺️  <b>Alacrity Research</b> — north-west corner, at the holographic city table.",
		"📺  <b>Mingalar News</b> — north-east corner, the studio with the video wall.",
		"💻  <b>Tun-PS-Lin</b> — south-east corner, the developer desk.",
	} do
		UI.text(b, line, 15, Color3.new(1, 1, 1), UI.Body)
	end
	UI.text(b, "Press E near each one to find out more. The exit is behind you.", 13, Color3.fromRGB(190, 195, 210), UI.Body)
end

-- ------------------------------------------------------------- home gallery
local ROOMS = {
	{ "Living Room", "🛋️", "Double-height glass wall facing the garden, with a sunken lounge and fireplace." },
	{ "Chef's Kitchen", "🍳", "Stone island, integrated appliances and a walk-in pantry behind a hidden door." },
	{ "Master Suite", "🛏️", "Corner suite with a private balcony, dressing room and spa bathroom." },
	{ "Home Cinema", "🎬", "Eight reclining seats, acoustic panelling and a starlight ceiling." },
	{ "Roof Terrace", "🌇", "Open-air lounge with an outdoor kitchen and sunset views over the town." },
}
function A.homeGallery()
	local i = 1
	local function render()
		local b = UI.clearPanel()
		local r = ROOMS[i]
		UI.text(b, r[2], 64, Color3.new(1, 1, 1), UI.Font, { align = Enum.TextXAlignment.Center })
		UI.text(b, ("%s   <font color='#c8cdd8'>%d / %d</font>"):format(r[1], i, #ROOMS), 22)
		UI.text(b, r[3], 15, Color3.fromRGB(215, 220, 230), UI.Body)
		local row = Instance.new("Frame")
		row.BackgroundTransparency = 1
		row.Size = UDim2.new(1, 0, 0, 40)
		row.Parent = b
		local prev = UI.button(row, "◀ Previous", function()
			i = (i - 2) % #ROOMS + 1
			render()
		end, { ghost = true, size = UDim2.new(0.5, -4, 1, 0) })
		prev.Position = UDim2.new()
		local nxt = UI.button(row, "Next ▶", function()
			i = i % #ROOMS + 1
			render()
		end, { ghost = true, size = UDim2.new(0.5, -4, 1, 0) })
		nxt.Position = UDim2.new(0.5, 4, 0, 0)
	end
	UI.openPanel({ id = "home", kicker = "Luxury Home", title = "Gallery tour" })
	render()
end

-- --------------------------------------------------------------------- gym
local working = nil
function A.workout()
	if working then
		return
	end
	local hum = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
	if not hum then
		return
	end
	local G = Config.Gym
	teleport(G.mat + Vector3.new(0, Config.Curb + 3, 0), Vector3.new(1, 0, 0))
	working = { reps = 0 }
	local w = working
	UI.hint("Jumping jacks! Move to stop")
	local startPos = root().Position
	w.conn = RunService.Heartbeat:Connect(function()
		local r = root()
		if not r or hum.MoveDirection.Magnitude > 0.3 or (r.Position - startPos).Magnitude > 6 then
			w.conn:Disconnect()
			working = nil
			UI.hud(nil)
			UI.hint(nil)
			if w.reps > 0 then
				UI.toast(("Workout done: %d jumping jack%s"):format(w.reps, w.reps == 1 and "" or "s"), 2)
			end
			return
		end
		if hum.FloorMaterial ~= Enum.Material.Air and hum:GetState() ~= Enum.HumanoidStateType.Jumping then
			hum.Jump = true
			w.reps += 1
			UI.hud(("Jumping jacks <b>%d</b>"):format(w.reps))
		end
	end)
end

-- ------------------------------------------------------------- ambient life
function A.ambient()
	local t = 0
	RunService.RenderStepped:Connect(function(dt)
		t += dt
		local cam = workspace.CurrentCamera.CFrame.Position
		for _, m in CollectionService:GetTagged("Spin") do
			if m:IsA("Model") and m.PrimaryPart and (m.PrimaryPart.Position - cam).Magnitude < 300 then
				local p = m:GetPivot()
				local axis = m.Name == "Windmill" and CFrame.Angles(dt * 1.2, 0, 0) or CFrame.Angles(0, dt * (m.Name == "HoloCity" and 0.15 or 0.8), 0)
				m:PivotTo(CFrame.new(p.Position) * axis * p.Rotation)
			end
		end
		for _, f in CollectionService:GetTagged("Flag") do
			if (f.Position - cam).Magnitude < 200 then
				local base = f:GetAttribute("Base")
				if not base then
					base = f.CFrame
					f:SetAttribute("Base", base)
				end
				f.CFrame = base * CFrame.Angles(0, math.sin(t * 3) * 0.12, 0)
			end
		end
		for _, l in CollectionService:GetTagged("Ticker") do
			l.Position = UDim2.fromScale(-((t * 0.05) % 1), 0.1)
		end
	end)
	-- golf movers slide back and forth (tagged on the server)
	task.spawn(function()
		while true do
			task.wait(1 / 20)
			for _, d in CollectionService:GetTagged("Mover") do
				local base, amp = d:GetAttribute("BaseZ"), d:GetAttribute("Amp")
				if base and (d.Position - workspace.CurrentCamera.CFrame.Position).Magnitude < 200 then
					local p = d.Position
					d.Position = Vector3.new(p.X, p.Y, base + math.sin(os.clock() * 1.3) * amp)
				end
			end
		end
	end)
end

return A
