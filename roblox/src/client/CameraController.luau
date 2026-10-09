--!nonstrict
-- First / third person views. In both, the character faces where the camera
-- looks (RotationType = CameraRelative). In third person the camera orbits
-- with a right-drag (Roblox default) or a touch drag; first person locks it.
-- Other modes (race, customise, golf) take the camera over with `own(fn)`.
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserGameSettings = UserSettings():GetService("UserGameSettings")

local Cam = {}
local player = Players.LocalPlayer
local camera = workspace.CurrentCamera

Cam.view = "third"
local owner = nil -- function(dt) that drives a Scriptable camera, or nil
local onChange = {}

local function walking()
	return owner == nil
end

function Cam.apply()
	if not walking() then
		player.CameraMode = Enum.CameraMode.Classic
		return
	end
	camera.CameraType = Enum.CameraType.Custom
	if Cam.view == "first" then
		player.CameraMode = Enum.CameraMode.LockFirstPerson
	else
		player.CameraMode = Enum.CameraMode.Classic
		player.CameraMinZoomDistance = 0.5
		player.CameraMaxZoomDistance = 60
	end
	for _, f in onChange do
		f(Cam.view)
	end
end

function Cam.toggle()
	Cam.view = Cam.view == "first" and "third" or "first"
	if Cam.view == "third" then
		-- step the zoom back out of the head
		player.CameraMinZoomDistance = 12
		task.defer(function()
			player.CameraMinZoomDistance = 0.5
		end)
	end
	Cam.apply()
end

function Cam.onChange(f)
	table.insert(onChange, f)
end

--- Take over the camera with fn(dt, camera); call Cam.release() to give it back.
function Cam.own(fn)
	owner = fn
	camera.CameraType = Enum.CameraType.Scriptable
	Cam.apply()
end
function Cam.release()
	owner = nil
	camera.CameraType = Enum.CameraType.Custom
	local hum = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
	if hum then
		camera.CameraSubject = hum
	end
	Cam.apply()
end
function Cam.owned()
	return owner ~= nil
end

RunService:BindToRenderStep("MingalarCamera", Enum.RenderPriority.Camera.Value + 1, function(dt)
	if owner then
		UserGameSettings.RotationType = Enum.RotationType.MovementRelative
		owner(dt, camera)
	else
		-- the avatar always faces the camera's look direction
		UserGameSettings.RotationType = Enum.RotationType.CameraRelative
	end
end)

player.CharacterAdded:Connect(function()
	task.defer(Cam.apply)
end)

return Cam
