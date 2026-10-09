--!nonstrict
-- Mini golf: three holes. The ball is a real physics part created on this
-- client (so it simulates locally and bounces off the rails). Aim with the
-- camera / A-D, hold Space (or the jump button) to charge, release to putt.
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local RS = game:GetService("ReplicatedStorage")
local Config = require(RS.Shared.Config)
local UI = require(script.Parent.UI)
local Cam = require(script.Parent.CameraController)

local Golf = {}
local player = Players.LocalPlayer
local Y = Config.Curb + 0.5 -- green surface
local HOLES = { { par = 2, z = 40 }, { par = 3, z = 60 }, { par = 3, z = 80 } }
local TEE, CUP = 197, 230.6
local active = nil

function Golf.start()
	if active then
		return
	end
	local g = { hole = 1, strokes = 0, card = {}, yaw = -math.pi / 2, power = 0, charging = false, t = 0, state = "aim" }
	active = g
	local ball = Instance.new("Part")
	ball.Shape = Enum.PartType.Ball
	ball.Size = Vector3.new(0.9, 0.9, 0.9)
	ball.Color = Color3.new(1, 1, 1)
	ball.Material = Enum.Material.SmoothPlastic
	ball.CustomPhysicalProperties = PhysicalProperties.new(1, 0.4, 0.75, 1, 1)
	ball.Parent = workspace
	local arrow = Instance.new("Part")
	arrow.Anchored, arrow.CanCollide, arrow.CanQuery, arrow.CastShadow = true, false, false, false
	arrow.Material = Enum.Material.Neon
	arrow.Color = Color3.new(1, 1, 1)
	arrow.Transparency = 0.2
	arrow.Parent = workspace
	g.ball, g.arrow = ball, arrow
	local hum = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
	if hum then
		hum.WalkSpeed = 0
		hum.JumpPower = 0
	end

	local function setup()
		local h = HOLES[g.hole]
		g.strokes = 0
		g.state = "aim"
		g.yaw = -math.pi / 2
		ball.AssemblyLinearVelocity = Vector3.zero
		ball.AssemblyAngularVelocity = Vector3.zero
		ball.CFrame = CFrame.new(TEE, Y + 0.5, h.z)
		ball.Transparency = 0
	end
	setup()

	local function hud()
		local h = HOLES[g.hole]
		UI.hud(("Hole <b>%d</b>/3   Par <b>%d</b>   Strokes <b>%d</b>"):format(g.hole, h.par, g.strokes))
	end
	hud()
	UI.hint(UI.touch and "Drag to aim · hold Jump to charge, release to putt" or "Drag / A-D to aim · hold Space to charge, release to putt · Q to leave")

	local conns = {}
	local keys = {}
	table.insert(conns, UserInputService.InputBegan:Connect(function(i, gp)
		if gp then
			return
		end
		keys[i.KeyCode] = true
		if i.KeyCode == Enum.KeyCode.Q then
			Golf.stop()
		end
	end))
	table.insert(conns, UserInputService.InputEnded:Connect(function(i)
		keys[i.KeyCode] = nil
	end))
	local dragging = false
	table.insert(conns, UserInputService.InputBegan:Connect(function(i, gp)
		if not gp and (i.UserInputType == Enum.UserInputType.MouseButton2 or i.UserInputType == Enum.UserInputType.MouseButton1 or i.UserInputType == Enum.UserInputType.Touch) then
			dragging = true
		end
	end))
	table.insert(conns, UserInputService.InputEnded:Connect(function(i)
		if i.UserInputType == Enum.UserInputType.MouseButton2 or i.UserInputType == Enum.UserInputType.MouseButton1 or i.UserInputType == Enum.UserInputType.Touch then
			dragging = false
		end
	end))
	table.insert(conns, UserInputService.InputChanged:Connect(function(i)
		if dragging and (i.UserInputType == Enum.UserInputType.MouseMovement or i.UserInputType == Enum.UserInputType.Touch) then
			g.yaw -= i.Delta.X * 0.006
		end
	end))

	local function charging()
		return keys[Enum.KeyCode.Space] or (hum and hum.Jump)
	end

	table.insert(conns, RunService.Heartbeat:Connect(function(dt)
		local h = HOLES[g.hole]
		local bp = ball.Position
		local fwd = Vector3.new(math.sin(g.yaw), 0, math.cos(g.yaw))
		if g.state == "aim" then
			local turn = (keys[Enum.KeyCode.A] and 1 or 0) - (keys[Enum.KeyCode.D] and 1 or 0)
			g.yaw += turn * 1.4 * dt
			if charging() then
				g.charging = true
				g.t += dt * 0.9
				local tri = g.t % 2
				g.power = tri < 1 and tri or 2 - tri
			elseif g.charging then
				g.charging = false
				g.t = 0
				g.strokes += 1
				ball.AssemblyLinearVelocity = fwd * (8 + g.power * 52)
				g.state = "roll"
				g.rollT = 0
				hud()
			end
			local len = 2.5 + g.power * 7
			arrow.Size = Vector3.new(0.25, 0.05, len)
			arrow.CFrame = CFrame.lookAt(bp + fwd * (0.8 + len / 2), bp + fwd * 10) - Vector3.new(0, 0.4, 0)
			arrow.Transparency = 0.2
			UI.hint(("Power %d%%"):format(math.floor(g.power * 100)))
			-- stand beside the ball
			local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
			if root then
				local right = Vector3.new(math.cos(g.yaw), 0, -math.sin(g.yaw))
				local pos = bp - right * 2.2 + Vector3.new(0, 2.6, 0)
				root.CFrame = CFrame.lookAt(pos, pos + right)
			end
		else
			arrow.Transparency = 1
			g.rollT += dt
			local v = ball.AssemblyLinearVelocity
			-- a little rolling friction so putts settle
			ball.AssemblyLinearVelocity = Vector3.new(v.X * (1 - 1.2 * dt), v.Y, v.Z * (1 - 1.2 * dt))
			local d = Vector2.new(bp.X - CUP, bp.Z - h.z).Magnitude
			if g.state == "roll" and d < 0.9 and v.Magnitude < 22 then
				g.state = "sunk"
				ball.Transparency = 1
				ball.AssemblyLinearVelocity = Vector3.zero
				table.insert(g.card, g.strokes)
				local diff = g.strokes - h.par
				UI.toast(g.strokes == 1 and "Hole in one!" or ({ [-2] = "Eagle!", [-1] = "Birdie!", [0] = "Par", [1] = "Bogey" })[diff] or ("+" .. diff), 1.6)
				task.delay(1.7, function()
					if active ~= g then
						return
					end
					if g.hole < #HOLES then
						g.hole += 1
						setup()
						hud()
					else
						Golf.finish(g)
					end
				end)
			elseif g.state == "roll" and (v.Magnitude < 0.6 and g.rollT > 0.5) then
				g.state = "aim"
				ball.AssemblyLinearVelocity = Vector3.zero
			elseif bp.Y < Y - 3 or bp.X < 190 or bp.X > 238 or math.abs(bp.Z - h.z) > 8 then
				-- out of bounds: back to the tee
				UI.toast("Out of bounds", 1)
				ball.AssemblyLinearVelocity = Vector3.zero
				ball.CFrame = CFrame.new(TEE, Y + 0.5, h.z)
				g.state = "aim"
			end
		end
	end))

	Cam.own(function(dt, camera)
		local bp = ball.Position
		local back = Vector3.new(-math.sin(g.yaw), 0, -math.cos(g.yaw))
		camera.CFrame = CFrame.lookAt(bp + back * 14 + Vector3.new(0, 8, 0), bp + Vector3.new(0, 1, 0))
	end)

	g.cleanup = function()
		for _, c in conns do
			c:Disconnect()
		end
		ball:Destroy()
		arrow:Destroy()
		if hum then
			hum.WalkSpeed = 18
			hum.JumpPower = 50
		end
		Cam.release()
		UI.hud(nil)
		UI.hint(nil)
	end
end

function Golf.finish(g)
	local total, par = 0, 0
	for i, s in g.card do
		total += s
		par += HOLES[i].par
	end
	local b = UI.openPanel({ id = "golf-card", kicker = "Mini Golf", title = "Scorecard" })
	for i, s in g.card do
		UI.text(b, ("Hole %d   par %d   <b>%d</b>"):format(i, HOLES[i].par, s), 16, Color3.new(1, 1, 1), UI.Body)
	end
	local diff = total - par
	UI.text(b, ("Total <b>%d</b> (%s)"):format(total, diff < 0 and (-diff .. " under par!") or diff == 0 and "level par" or (diff .. " over par")), 18)
	UI.button(b, "Play again", function()
		UI.closePanel()
		Golf.stop()
		task.delay(0.1, Golf.start)
	end)
	UI.button(b, "Leave", function()
		UI.closePanel()
		Golf.stop()
	end, { ghost = true })
end

function Golf.stop()
	local g = active
	if not g then
		return
	end
	active = nil
	g.cleanup()
	local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
	if root then
		root.CFrame = CFrame.new(Config.Golf.x0 - 6, Config.Curb + 3, 58) * CFrame.Angles(0, math.rad(90), 0)
	end
end

function Golf.active()
	return active ~= nil
end

return Golf
