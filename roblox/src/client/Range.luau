--!nonstrict
-- Gun range rounds: pick a weapon (the server hands over a Tool), stand at the
-- firing line and score on dummies and bullseye boards for 60 seconds.
-- Targets move and fall on this client only; shooting is a solo activity.
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local CollectionService = game:GetService("CollectionService")
local Debris = game:GetService("Debris")
local RS = game:GetService("ReplicatedStorage")
local Config = require(RS.Shared.Config)
local UI = require(script.Parent.UI)
local Cam = require(script.Parent.CameraController)

local Range = {}
local player = Players.LocalPlayer
local R = Config.Range
local FLOOR = Config.Curb + 0.6
local active = nil
local targets = {}

-- --------------------------------------------------------------- targets
local function register(m)
	if targets[m] then
		return
	end
	local pivot = m:GetPivot()
	targets[m] = { model = m, base = pivot, move = m:GetAttribute("Move") or 0, speed = m:GetAttribute("Speed") or 1, phase = math.random() * 6, down = 0, fall = 0 }
end

function Range.init(state)
	Range.state = state
	for _, m in CollectionService:GetTagged("RangeTarget") do
		register(m)
	end
	CollectionService:GetInstanceAddedSignal("RangeTarget"):Connect(register)
	CollectionService:GetInstanceRemovedSignal("RangeTarget"):Connect(function(m)
		targets[m] = nil
	end)
	local t = 0
	RunService.Heartbeat:Connect(function(dt)
		t += dt
		local cam = workspace.CurrentCamera.CFrame.Position
		if cam.X < R.x0 - 40 or cam.X > R.x1 + 40 or cam.Z < R.z0 - 40 or cam.Z > R.z1 + 40 then
			return -- nobody here: don't animate
		end
		for _, tg in targets do
			if tg.down > 0 then
				tg.down -= dt
				tg.fall = math.min(1, tg.fall + dt * 7)
			else
				tg.fall = math.max(0, tg.fall - dt * 4)
			end
			local x = tg.move ~= 0 and math.sin(t * tg.speed + tg.phase) * tg.move or 0
			-- fall backwards around the base
			tg.model:PivotTo(tg.base * CFrame.new(x, 0, 0) * CFrame.Angles(tg.fall * 1.45, 0, 0))
		end
	end)
end

-- ---------------------------------------------------------------- picker
function Range.openPicker()
	local state = Range.state
	local b = UI.openPanel({ id = "range", kicker = "Gun Range", title = "Pick a weapon" })
	for _, id in Config.WeaponOrder do
		local w = Config.Weapons[id]
		local best = state.profile.range[id]
		UI.button(b, ("%s  %s   ·  %s · %d rds%s"):format(w.icon, w.name, w.auto and "Auto" or "Semi", w.mag, best and ("  · best " .. best) or ""), function()
			UI.closePanel()
			Range.start(id)
		end, { height = 44, ghost = true, textSize = 15 })
	end
	UI.text(b, "60-second rounds. Dummies score 10 (head 25), bullseyes up to 50. Moving and far targets give a bonus.", 13, Color3.fromRGB(200, 205, 215), UI.Body)
end

-- ------------------------------------------------------------------ round
local function hud(r)
	local acc = r.shots > 0 and math.floor(r.hits / r.shots * 100) or 0
	UI.hud(("%s <b>%s</b>   Ammo <b>%s</b>/%d   Time <b>%d</b>   Score <b>%d</b>   Acc <b>%d%%</b>"):format(
		r.weapon.icon, r.weapon.name, r.reloading > 0 and "…" or tostring(r.ammo), r.weapon.mag, math.ceil(r.time), r.score, acc))
end

local crosshair, scope
local function overlays()
	if crosshair then
		return
	end
	crosshair = Instance.new("Frame")
	crosshair.BackgroundTransparency = 1
	crosshair.AnchorPoint = Vector2.new(0.5, 0.5)
	crosshair.Size = UDim2.fromOffset(24, 24)
	crosshair.Visible = false
	crosshair.Parent = UI.gui
	for _, d in { { 0.5, 0, 2, 7 }, { 0.5, 1, 2, 7 }, { 0, 0.5, 7, 2 }, { 1, 0.5, 7, 2 } } do
		local f = Instance.new("Frame")
		f.AnchorPoint = Vector2.new(d[1], d[2])
		f.Position = UDim2.fromScale(d[1], d[2])
		f.Size = UDim2.fromOffset(d[3], d[4])
		f.BackgroundColor3 = Color3.new(1, 1, 1)
		f.BorderSizePixel = 0
		local s = Instance.new("UIStroke")
		s.Thickness = 1
		s.Parent = f
		f.Parent = crosshair
	end
	scope = Instance.new("ImageLabel")
	scope.BackgroundTransparency = 1
	scope.Size = UDim2.fromScale(1, 1)
	scope.Visible = false
	scope.Parent = UI.gui
	for _, d in { { 0, 0, 0.32, 1 }, { 0.68, 0, 0.32, 1 }, { 0.32, 0, 0.36, 0.12 }, { 0.32, 0.88, 0.36, 0.12 } } do
		local f = Instance.new("Frame")
		f.Position = UDim2.fromScale(d[1], d[2])
		f.Size = UDim2.fromScale(d[3], d[4])
		f.BackgroundColor3 = Color3.new()
		f.BorderSizePixel = 0
		f.Parent = scope
	end
	local ring = Instance.new("Frame")
	ring.AnchorPoint = Vector2.new(0.5, 0.5)
	ring.Position = UDim2.fromScale(0.5, 0.5)
	ring.Size = UDim2.fromScale(0.36, 0.76)
	ring.BackgroundTransparency = 1
	local st = Instance.new("UIStroke")
	st.Thickness = 3
	st.Parent = ring
	UI.corner(ring, 1000)
	ring.Parent = scope
end

local function popup(text)
	local t = UI.text(UI.gui, text, 22, UI.Accent, UI.Font, { align = Enum.TextXAlignment.Center })
	t.AnchorPoint = Vector2.new(0.5, 0.5)
	t.Position = UDim2.fromScale(0.5, 0.42)
	t.Size = UDim2.fromOffset(300, 30)
	t.TextStrokeTransparency = 0.4
	game:GetService("TweenService"):Create(t, TweenInfo.new(0.7), { Position = UDim2.fromScale(0.5, 0.36), TextTransparency = 1, TextStrokeTransparency = 1 }):Play()
	Debris:AddItem(t, 0.75)
end

local function tracer(from, to)
	local p = Instance.new("Part")
	p.Anchored, p.CanCollide, p.CanQuery, p.CanTouch, p.CastShadow = true, false, false, false, false
	p.Material = Enum.Material.Neon
	p.Color = Color3.fromRGB(255, 233, 160)
	p.Size = Vector3.new(0.06, 0.06, (to - from).Magnitude)
	p.CFrame = CFrame.lookAt((from + to) / 2, to)
	p.Parent = workspace
	Debris:AddItem(p, 0.05)
	local spark = Instance.new("Part")
	spark.Anchored, spark.CanCollide, spark.CanQuery, spark.CanTouch, spark.CastShadow = true, false, false, false, false
	spark.Material = Enum.Material.Neon
	spark.Color = Color3.fromRGB(255, 211, 107)
	spark.Shape = Enum.PartType.Ball
	spark.Size = Vector3.new(0.4, 0.4, 0.4)
	spark.Position = to
	spark.Parent = workspace
	Debris:AddItem(spark, 0.08)
end

function Range.start(id)
	local state = Range.state
	if active then
		return
	end
	local w = Config.Weapons[id]
	overlays()
	UI.fade(function()
		state.remotes.RangeEquip:FireServer(id)
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if root then
			local pos = Vector3.new(R.x0 + 34, FLOOR + 3, R.line - 3.2)
			root.CFrame = CFrame.lookAt(pos, pos + Vector3.new(0, 0, 1))
			root.AssemblyLinearVelocity = Vector3.zero
		end
	end)
	local r = {
		weapon = w, id = id, ammo = w.mag, cool = 0, reloading = 0, score = 0, hits = 0, shots = 0,
		time = Config.RoundTime, phase = "ready", firing = false, scoped = false,
	}
	active = r
	crosshair.Visible = true
	UI.hint(UI.touch and "Tap to shoot · Leave with the button" or "Click to shoot · R reload · " .. (w.scope and "Right-click scope · " or "") .. "V view · Q leave")
	UI.toast("The round starts on your first shot", 1.8)
	local hum = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
	if hum then
		hum.WalkSpeed = 0
		hum.JumpPower = 0
	end
	local conns = {}
	local function shoot()
		if r.cool > 0 or r.reloading > 0 or r.phase == "over" then
			return
		end
		if r.ammo <= 0 then
			r.reloading = w.reload
			return
		end
		if r.phase == "ready" then
			r.phase = "play"
		end
		r.cool = w.rate
		r.ammo -= 1
		r.shots += 1
		local camera = workspace.CurrentCamera
		local mouse = UserInputService:GetMouseLocation()
		if Cam.view == "first" or r.scoped or UI.touch then
			mouse = camera.ViewportSize / 2 + Vector2.new(0, 0)
		end
		local params = RaycastParams.new()
		params.FilterType = Enum.RaycastFilterType.Exclude
		params.FilterDescendantsInstances = { player.Character, workspace:FindFirstChild("Showroom") }
		local tool = player.Character and player.Character:FindFirstChildOfClass("Tool")
		local muzzle = tool and tool:FindFirstChild("Handle") and tool.Handle:FindFirstChild("Muzzle")
		local hitAny = false
		local spread = w.spread * (r.scoped and 0.1 or 1)
		for _ = 1, w.pellets do
			local ray = camera:ViewportPointToRay(mouse.X, mouse.Y)
			local dir = (ray.Direction + Vector3.new((math.random() - 0.5) * 2 * spread, (math.random() - 0.5) * 2 * spread, (math.random() - 0.5) * 2 * spread)).Unit
			local res = workspace:Raycast(ray.Origin, dir * 400, params)
			local endPos = res and res.Position or (ray.Origin + dir * 400)
			tracer(muzzle and muzzle.WorldPosition or ray.Origin, endPos)
			if res then
				local m = res.Instance:FindFirstAncestorOfClass("Model")
				local tg = m and targets[m]
				if tg and tg.fall < 0.5 then
					local part = res.Instance.Name
					local pts
					if part == "Head" then
						pts = 25
					elseif part == "Body" then
						pts = 10
					elseif part == "Board" then
						local lp = res.Instance.CFrame:PointToObjectSpace(res.Position)
						local d = math.sqrt(lp.X ^ 2 + lp.Y ^ 2) / 1.6
						pts = d < 0.1 and 50 or d < 0.3 and 30 or d < 0.5 and 20 or d < 0.75 and 10 or 5
					end
					if pts then
						local dist = (res.Position - ray.Origin).Magnitude
						pts = math.floor(pts * (tg.move ~= 0 and 1.5 or 1) * (dist > 80 and 1.5 or dist > 50 and 1.2 or 1))
						if not hitAny then
							hitAny = true
							r.hits += 1
						end
						if r.phase == "play" then
							r.score += pts
						end
						if part ~= "Board" or pts >= 30 then
							tg.down = part == "Head" and 2.5 or 1.6
						end
						popup("+" .. pts .. (part == "Head" and " HEADSHOT" or pts >= 50 and " BULLSEYE" or ""))
					end
				end
			end
		end
		-- recoil
		local cf = camera.CFrame
		camera.CFrame = cf * CFrame.Angles(w.recoil * (r.scoped and 0.3 or 1), (math.random() - 0.5) * w.recoil * 0.3, 0)
		if r.ammo == 0 then
			task.delay(0.2, function()
				if active == r and r.reloading <= 0 then
					r.reloading = w.reload
				end
			end)
		end
	end
	local function setScope(on)
		r.scoped = on and w.scope or false
		scope.Visible = r.scoped
		crosshair.Visible = not r.scoped
		workspace.CurrentCamera.FieldOfView = r.scoped and 18 or 70
	end
	table.insert(conns, UserInputService.InputBegan:Connect(function(i, gp)
		if gp then
			return
		end
		if i.UserInputType == Enum.UserInputType.MouseButton1 or i.UserInputType == Enum.UserInputType.Touch then
			r.firing = true
			shoot()
		elseif i.UserInputType == Enum.UserInputType.MouseButton2 then
			setScope(not r.scoped)
		elseif i.KeyCode == Enum.KeyCode.R and r.ammo < w.mag and r.reloading <= 0 then
			r.reloading = w.reload
			setScope(false)
		elseif i.KeyCode == Enum.KeyCode.Q then
			Range.leave()
		end
	end))
	table.insert(conns, UserInputService.InputEnded:Connect(function(i)
		if i.UserInputType == Enum.UserInputType.MouseButton1 or i.UserInputType == Enum.UserInputType.Touch then
			r.firing = false
		end
	end))
	table.insert(conns, RunService.RenderStepped:Connect(function(dt)
		local m = UserInputService:GetMouseLocation()
		if Cam.view == "first" or UI.touch then
			crosshair.Position = UDim2.fromScale(0.5, 0.5)
		else
			crosshair.Position = UDim2.fromOffset(m.X, m.Y)
		end
		UserInputService.MouseIconEnabled = Cam.view == "first"
		r.cool -= dt
		if r.reloading > 0 then
			r.reloading -= dt
			if r.reloading <= 0 then
				r.reloading = 0
				r.ammo = w.mag
			end
		end
		if w.auto and r.firing then
			shoot()
		end
		if r.phase == "play" then
			r.time -= dt
			if r.time <= 0 then
				r.time = 0
				Range.finish(r)
			end
		end
		hud(r)
	end))
	r.cleanup = function()
		for _, c in conns do
			c:Disconnect()
		end
		setScope(false)
		crosshair.Visible = false
		UserInputService.MouseIconEnabled = true
		if hum then
			hum.WalkSpeed = 18
			hum.JumpPower = 50
		end
		UI.hud(nil)
		UI.hint(nil)
	end
end

function Range.finish(r)
	r.phase = "over"
	r.firing = false
	local state = Range.state
	local prev = state.profile.range[r.id] or 0
	if r.score > prev then
		state.profile.range[r.id] = r.score
		state.remotes.SaveProfile:FireServer("range", r.id, r.score)
	end
	local acc = r.shots > 0 and math.floor(r.hits / r.shots * 100) or 0
	local b = UI.openPanel({ id = "range-results", kicker = "Gun Range", title = "Round over" })
	UI.text(b, "🎯", 56, Color3.new(1, 1, 1), UI.Font, { align = Enum.TextXAlignment.Center })
	UI.text(b, ("Score <b>%d</b> · hits %d / %d · accuracy %d%%"):format(r.score, r.hits, r.shots, acc), 18, Color3.new(1, 1, 1), UI.Body, { align = Enum.TextXAlignment.Center })
	UI.text(b, r.score > prev and ("New personal best with the " .. r.weapon.name .. "!") or ("Best with the " .. r.weapon.name .. ": " .. prev), 14, Color3.fromRGB(200, 205, 215), UI.Body, { align = Enum.TextXAlignment.Center })
	UI.button(b, "Go again", function()
		UI.closePanel()
		local id = r.id
		r.cleanup()
		active = nil
		Range.start(id)
	end)
	UI.button(b, "Change weapon", function()
		r.cleanup()
		active = nil
		Range.openPicker()
	end, { ghost = true })
	UI.button(b, "Leave", function()
		UI.closePanel()
		Range.leave()
	end, { ghost = true })
end

function Range.leave()
	local r = active
	if not r then
		return
	end
	active = nil
	local state = Range.state
	UI.fade(function()
		r.cleanup()
		state.remotes.RangeEquip:FireServer(nil)
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if root then
			local pos = Vector3.new(80, FLOOR + 3, 58)
			root.CFrame = CFrame.lookAt(pos, pos - Vector3.new(0, 0, 1))
		end
	end)
end

function Range.active()
	return active ~= nil
end

return Range
