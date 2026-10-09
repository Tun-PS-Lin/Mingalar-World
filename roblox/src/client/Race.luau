--!nonstrict
-- Racing on the Mingalar Raceway: arcade physics, three local AI rivals,
-- countdown lights, laps and timing, chase and cockpit cameras.
-- The player's car is built by the server (so everyone sees it) and driven
-- from here: this client owns its physics and sets its CFrame every frame.
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local RS = game:GetService("ReplicatedStorage")
local Config = require(RS.Shared.Config)
local CarModel = require(RS.Shared.CarModel)
local TrackPath = require(RS.Shared.TrackPath)
local RacePhysics = require(RS.Shared.RacePhysics)
local U = require(RS.Shared.Util)
local UI = require(script.Parent.UI)
local Cam = require(script.Parent.CameraController)
local Minimap = require(script.Parent.Minimap)

local Race = {}
local player = Players.LocalPlayer
local LAPS = Config.Track.laps
local active = nil

local function fmt(t)
	if not t or t ~= t or t == math.huge then
		return "--"
	end
	local m = math.floor(t / 60)
	return ("%d:%05.2f"):format(m, t - m * 60)
end

local physics, aiInput = RacePhysics.step, RacePhysics.ai

-- heading h (forward = (sin h, cos h)) -> a CFrame looking that way
local function carCF(car, roll, pitch)
	local pos = Vector3.new(car.x, 0, car.z)
	local dir = Vector3.new(math.sin(car.h), 0, math.cos(car.h))
	return CFrame.lookAt(pos, pos + dir) * CFrame.Angles(pitch or 0, 0, roll or 0)
end

-- ------------------------------------------------------------------ race
function Race.start(state, kind, mods)
	if active then
		return
	end
	local model
	UI.fade(function()
		model = state.remotes.StartRace:InvokeServer(kind, mods)
		-- make sure the start straight (gantry, lights) has streamed in
		local tr0 = TrackPath.get()
		pcall(function()
			player:RequestStreamAroundAsync(tr0.pts[1], 3)
		end)
	end)
	if not model then
		UI.toast("Could not start the race. Try again.", 2)
		return
	end
	local tr = TrackPath.get()
	local stats = Config.carStats(kind, mods)
	local root = model:WaitForChild("Root")
	-- jumping would pop us out of the seat: Space is the handbrake while racing
	local myHum = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
	if myHum then
		myHum:SetStateEnabled(Enum.HumanoidStateType.Jumping, false)
	end
	local motors = {}
	for _, m in root:GetChildren() do
		if m:IsA("Motor6D") then
			table.insert(motors, m)
		end
	end
	local nitroParts = {}
	for _, d in model:GetDescendants() do
		if d.Name == "Nitro" then
			table.insert(nitroParts, d)
		end
	end
	local tail = model:FindFirstChild("Tail")
	local eye = model:GetAttribute("Eye") or Vector3.new(1, 3, 0)
	local radius = model:GetAttribute("Radius") or 1

	local function newCar(slot, side, ai)
		local k = (tr.N - slot) % tr.N + 1
		local p, r, t = tr.pts[k], tr.R[k], tr.T[k]
		return {
			x = p.X + r.X * side * 8, z = p.Z + r.Z * side * 8, h = math.atan2(t.X, t.Z),
			vf = 0, vs = 0, steer = 0, k = k, lap = 0, cps = 0, prog = -slot, done = false,
			lane = side * 8, spin = 0, ai = ai, lapTimes = {},
		}
	end
	local me = newCar(16, 1, false)
	local cars = { me }
	local rivals = {}
	for i, rk in { "apex", "vortex", "thunder" } do
		local rkind = rk == kind and "summit" or rk
		local rmods = Config.defaultMods(rkind)
		rmods.paint = ({ 0xff7a3d, 0xf4f1ea, 0x8e5bd6 })[i]
		rmods.spoiler = ({ "wing", "gt", "lip" })[i]
		local rstats = Config.carStats(rkind, rmods)
		local c = newCar(({ 4, 8, 12 })[i], i % 2 == 1 and -1 or 1, true)
		c.top = rstats.top * (0.86 + i * 0.04)
		c.stats = { top = c.top, accel = rstats.accel, grip = rstats.grip }
		c.built = CarModel.build(rkind, rmods, { parent = workspace })
		table.insert(cars, c)
		table.insert(rivals, c)
	end

	local lights = {}
	local function findLights()
		local gantry = workspace:FindFirstChild("Map") and workspace.Map:FindFirstChild("Gantry", true)
		if gantry then
			for i = 1, 5 do
				local l = gantry:FindFirstChild("Light" .. i, true)
				if l then
					lights[i] = l
				end
			end
		end
	end
	local function setLights(n, green)
		if #lights < 5 then
			findLights() -- they may stream in after the race starts
		end
		for i, l in lights do
			l.Material = (i <= n) and Enum.Material.Neon or Enum.Material.SmoothPlastic
			l.Color = green and Color3.fromRGB(52, 199, 89) or (i <= n and Color3.fromRGB(255, 42, 42) or Color3.fromRGB(51, 0, 0))
		end
	end

	local race = {
		phase = "countdown", countdown = 4.2, timer = 0, nitro = 1, view = "chase",
		camYaw = me.h + math.pi, look = { yaw = 0, pitch = 0 }, best = state.profile.laps[kind],
		lastN = nil :: number?, results = false, hudT = 0, step = nil :: RBXScriptConnection?, cleanup = nil :: (() -> ())?,
	}
	active = race
	UI.hint(UI.touch and "Thumbstick: steer & throttle · Jump: handbrake" or "W/S throttle & brake · A/D steer · Space handbrake · Shift nitro · V camera · Q leave")
	Minimap.focus = function()
		return carCF(me)
	end
	Minimap.markers = function()
		local list = {}
		for _, c in rivals do
			table.insert(list, { x = c.x, z = c.z, color = Color3.fromRGB(255, 77, 109) })
		end
		return list
	end

	-- input
	local keys = {}
	local conns = {}
	table.insert(conns, UserInputService.InputBegan:Connect(function(i, gp)
		if gp then
			return
		end
		keys[i.KeyCode] = true
		if i.KeyCode == Enum.KeyCode.V then
			race.view = race.view == "chase" and "cockpit" or "chase"
		elseif i.KeyCode == Enum.KeyCode.Q then
			Race.leave(state)
		end
	end))
	table.insert(conns, UserInputService.InputEnded:Connect(function(i)
		keys[i.KeyCode] = nil
	end))

	local function progress(car)
		if RacePhysics.lapCheck(car, tr) then
			local lapT = race.timer - (car.lastLapAt or 0)
			car.lastLapAt = race.timer
			if not car.ai then
				table.insert(car.lapTimes, lapT)
				if car.lap < LAPS then
					UI.toast(("Lap %d: %s"):format(car.lap, fmt(lapT)), 1.8)
				end
				if not race.best or lapT < race.best then
					race.best = lapT
					state.profile.laps[kind] = lapT
					state.remotes.SaveProfile:FireServer("laps", kind, lapT)
				end
			end
			if car.lap >= LAPS and not car.done then
				car.done = true
				car.finishT = race.timer
				local n = 0
				for _, c in cars do
					if c.done then
						n += 1
					end
				end
				car.place = n
				if not car.ai then
					Race.finish(state, race, me, kind)
				end
			end
		end
	end

	local function position()
		local pos = 1
		for _, c in cars do
			if c ~= me and ((c.done and not me.done) or c.prog > me.prog) then
				pos += 1
			end
		end
		return pos
	end

	race.step = RunService.Heartbeat:Connect(function(dt)
		dt = math.min(dt, 1 / 20)
		if race.phase == "countdown" then
			race.countdown -= dt
			local lit = math.clamp(math.floor((4.2 - race.countdown) * 5 / 3), 0, 5)
			setLights(lit, false)
			local n = math.ceil(race.countdown - 1.2)
			if n ~= race.lastN then
				race.lastN = n
				if n >= 1 and n <= 3 then
					UI.toast(tostring(n), 0.7)
				end
			end
			if race.countdown <= 1.2 then
				race.phase = "race"
				race.timer = 0
				setLights(5, true)
				UI.toast("GO!", 0.9)
			end
		else
			race.timer += dt
			if race.timer > 4 and race.timer - dt <= 4 then
				setLights(0, false)
			end
		end
		local racing = race.phase == "race"
		-- player input (keyboard or the touch thumbstick via MoveDirection)
		local hum = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
		local up = (keys[Enum.KeyCode.W] or keys[Enum.KeyCode.Up]) and 1 or 0
		local down = (keys[Enum.KeyCode.S] or keys[Enum.KeyCode.Down]) and 1 or 0
		local left = (keys[Enum.KeyCode.A] or keys[Enum.KeyCode.Left]) and 1 or 0
		local right = (keys[Enum.KeyCode.D] or keys[Enum.KeyCode.Right]) and 1 or 0
		if UI.touch and hum then
			local md = hum.MoveDirection
			local cam = workspace.CurrentCamera.CFrame
			local f = Vector3.new(cam.LookVector.X, 0, cam.LookVector.Z).Unit
			local rt = Vector3.new(cam.RightVector.X, 0, cam.RightVector.Z).Unit
			up, down = math.max(0, md:Dot(f)), math.max(0, -md:Dot(f))
			right, left = math.max(0, md:Dot(rt)), math.max(0, -md:Dot(rt))
		end
		local shift = keys[Enum.KeyCode.LeftShift] or keys[Enum.KeyCode.RightShift]
		local nitroOn = racing and stats.nitro and shift and race.nitro > 0.02
		race.nitro = nitroOn and math.max(0, race.nitro - dt * 0.28) or math.min(1, race.nitro + dt * 0.07)
		local input = {
			throttle = (racing and not me.done) and up or 0,
			brake = racing and down or 0,
			steer = left - right,
			handbrake = keys[Enum.KeyCode.Space] or (hum and hum.Jump),
			nitro = nitroOn,
		}
		for _, f in nitroParts do
			f.Transparency = nitroOn and 0.2 or 1
		end
		for _, c in cars do
			physics(c, c.ai and aiInput(c, tr, racing) or input, c.ai and c.stats or stats, tr, dt)
		end
		-- car-to-car pushes
		for i = 1, #cars do
			for j = i + 1, #cars do
				local a, b = cars[i], cars[j]
				local dx, dz = b.x - a.x, b.z - a.z
				local d = math.sqrt(dx * dx + dz * dz)
				if d > 0.01 and d < 6.4 then
					local push = (6.4 - d) / 2
					a.x -= dx / d * push
					a.z -= dz / d * push
					b.x += dx / d * push
					b.z += dz / d * push
				end
			end
		end
		for _, c in cars do
			progress(c)
			c.spin += c.vf * dt / radius
			c.roll = U.damp(c.roll or 0, math.clamp((c.yawRate or 0) * c.vf * 0.002, -0.07, 0.07), 6, dt)
			c.pitch = U.damp(c.pitch or 0, math.clamp((c.accelNow or 0) * 0.025, -0.03, 0.03), 6, dt)
		end
		-- the player's car: move the (client-owned) assembly
		local cf = carCF(me, me.roll, me.pitch)
		root.CFrame = cf
		root.AssemblyLinearVelocity = Vector3.new(math.sin(me.h) * me.vf, 0, math.cos(me.h) * me.vf)
		root.AssemblyAngularVelocity = Vector3.zero
		for _, m in motors do
			local front = m:GetAttribute("Front")
			local side = m:GetAttribute("Side") or 1
			m.Transform = CFrame.Angles(0, front and me.steer * 1.4 or 0, 0) * CFrame.Angles(-side * me.spin, 0, 0)
		end
		if tail then
			tail.Color = (input.brake > 0.1 or input.handbrake) and Color3.fromRGB(255, 80, 80) or Color3.fromRGB(255, 42, 42)
		end
		for _, c in rivals do
			CarModel.place(c.built, carCF(c, c.roll, c.pitch), c.spin, c.steer * 1.4)
		end
		race.hudT = (race.hudT or 0) - dt
		if race.hudT <= 0 and not race.results then
			race.hudT = 0.1
			local lap = math.clamp(me.lap + 1, 1, LAPS)
			local t = race.phase == "countdown" and 0 or race.timer
			local nitro = stats.nitro and ("   Nitro <b>%d%%</b>"):format(math.floor(race.nitro * 100)) or ""
			UI.hud(("Lap <b>%d</b>/%d   Pos <b>%d</b>/4   <b>%s</b>   %s   <b>%d</b> km/h%s"):format(lap, LAPS, position(), fmt(t), race.best and ("Best " .. fmt(race.best)) or "", math.floor(math.abs(me.vf) * 1.8), nitro))
		end
	end)

	-- cameras
	Cam.own(function(dt, camera)
		local carPos = Vector3.new(me.x, 0, me.z)
		local char = player.Character
		local cockpit = race.view == "cockpit"
		if char then
			for _, d in char:GetDescendants() do
				if d:IsA("BasePart") then
					d.LocalTransparencyModifier = cockpit and 1 or 0
				end
			end
		end
		if cockpit then
			local eyeW = root.CFrame:PointToWorldSpace(eye)
			camera.FieldOfView = 78
			camera.CFrame = CFrame.lookAt(eyeW, eyeW + root.CFrame.LookVector * 10 - Vector3.new(0, 0.6, 0))
			return
		end
		local speed = math.abs(me.vf)
		race.camYaw = U.dampAngle(race.camYaw, me.h + (me.vf < -2 and 0 or math.pi), 4, dt)
		local dist, height = 19 + speed * 0.04, 7.2
		local want = carPos + Vector3.new(math.sin(race.camYaw) * dist, height, math.cos(race.camYaw) * dist)
		local cur = camera.CFrame.Position
		local pos = cur:Lerp(want, 1 - math.exp(-10 * dt))
		if (cur - want).Magnitude > 80 then
			pos = want
		end
		camera.FieldOfView = U.damp(camera.FieldOfView, 70 + speed * 0.09, 4, dt)
		camera.CFrame = CFrame.lookAt(pos, carPos + Vector3.new(0, 3, 0))
	end)

	race.cleanup = function()
		race.step:Disconnect()
		for _, c in conns do
			c:Disconnect()
		end
		for _, c in rivals do
			c.built.model:Destroy()
		end
		setLights(0, false)
		Minimap.focus, Minimap.markers = nil, nil
		local char = player.Character
		if char then
			for _, d in char:GetDescendants() do
				if d:IsA("BasePart") then
					d.LocalTransparencyModifier = 0
				end
			end
		end
		workspace.CurrentCamera.FieldOfView = 70
		if myHum then
			myHum:SetStateEnabled(Enum.HumanoidStateType.Jumping, true)
		end
		Cam.release()
		UI.hud(nil)
		UI.hint(nil)
	end
end

function Race.finish(state, race, me, kind)
	race.results = true
	UI.hud(nil)
	local best = math.huge
	for _, t in me.lapTimes do
		best = math.min(best, t)
	end
	local b = UI.openPanel({ id = "race-results", kicker = "Mingalar Raceway", title = "Race results" })
	local medal = ({ "🥇", "🥈", "🥉", "4th" })[me.place] or "🏁"
	UI.text(b, medal, 56, Color3.new(1, 1, 1), UI.Font, { align = Enum.TextXAlignment.Center })
	UI.text(b, me.place == 1 and "You win!" or ("You finished " .. ({ "1st", "2nd", "3rd", "4th" })[me.place]), 20, Color3.new(1, 1, 1), UI.Font, { align = Enum.TextXAlignment.Center })
	for i, t in me.lapTimes do
		UI.text(b, ("Lap %d   <b>%s</b>"):format(i, fmt(t)), 16, Color3.new(1, 1, 1), UI.Body)
	end
	UI.text(b, ("Total <b>%s</b> · best lap %s · personal best %s"):format(fmt(me.finishT), fmt(best), fmt(state.profile.laps[kind])), 14, Color3.fromRGB(200, 205, 215), UI.Body)
	UI.button(b, "Race again", function()
		UI.closePanel()
		Race.leave(state, function()
			Race.start(state, kind, require(script.Parent.GarageClient).modsFor(state, kind))
		end)
	end)
	UI.button(b, "Back to the garage", function()
		UI.closePanel()
		Race.leave(state)
	end, { ghost = true })
end

function Race.leave(state, after)
	local race = active
	if not race then
		return
	end
	active = nil
	UI.fade(function()
		race.cleanup()
		state.remotes.EndRace:FireServer()
	end)
	if after then
		task.delay(0.6, after)
	end
end

function Race.active()
	return active ~= nil
end

return Race
