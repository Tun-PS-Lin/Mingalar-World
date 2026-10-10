--!nonstrict
-- Avatar editor panel. Changes are sent to the server (which rebuilds the
-- character) and saved with the player's profile. The camera swings round to
-- the front of the avatar while the panel is open.
local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local Config = require(RS.Shared.Config)
local UI = require(script.Parent.UI)
local Cam = require(script.Parent.CameraController)

local Customize = {}
local player = Players.LocalPlayer
local A = Config.Avatar

local PRESETS = {
	{ "Classic", {} },
	{ "Street", { hair = "spiky", hairColor = 0x14110f, shirt = "hoodie", shirtColor = 0x23262f, pattern = "logo", pants = "jeans", pantsColor = 0x23262f, shoes = 0xe2483d, glasses = "shades" } },
	{ "Sunny", { body = "female", hair = "ponytail", hairColor = 0xe8c070, shirt = "tee", shirtColor = 0xffc83d, pattern = "star", pants = "skirt", pantsColor = 0x2bb3e6 } },
	{ "Formal", { shirt = "jacket", shirtColor = 0x14182b, pants = "jeans", pantsColor = 0x23262f, shoes = 0x14110f, hat = "tophat", hatColor = 0x14182b } },
	{ "Hero", { body = "female", hair = "long", hairColor = 0xe2483d, shirt = "tee", shirtColor = 0x2e6fdb, pattern = "star", pants = "jeans", pantsColor = 0x2e6fdb, back = "cape", backColor = 0xe2483d } },
}
local TABS = { { "body", "🧍 Body" }, { "hair", "💇 Hair" }, { "top", "👕 Top" }, { "bottom", "👖 Bottom" }, { "extras", "🎩 Extras" } }

function Customize.open(state)
	local look = table.clone(state.profile.look)
	local tab = "body"
	local orbit = { yaw = 0, pitch = 0.12, dist = 11 }
	local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
	if root then
		local lv = root.CFrame.LookVector
		orbit.yaw = math.atan2(lv.X, lv.Z)
	end
	local dragging = false
	local conns = {}
	table.insert(conns, UserInputService.InputBegan:Connect(function(i, gp)
		if not gp and (i.UserInputType == Enum.UserInputType.MouseButton1 or i.UserInputType == Enum.UserInputType.MouseButton2 or i.UserInputType == Enum.UserInputType.Touch) then
			dragging = true
		end
	end))
	table.insert(conns, UserInputService.InputEnded:Connect(function(i)
		if i.UserInputType == Enum.UserInputType.MouseButton1 or i.UserInputType == Enum.UserInputType.MouseButton2 or i.UserInputType == Enum.UserInputType.Touch then
			dragging = false
		end
	end))
	table.insert(conns, UserInputService.InputChanged:Connect(function(i)
		if dragging and (i.UserInputType == Enum.UserInputType.MouseMovement or i.UserInputType == Enum.UserInputType.Touch) then
			orbit.yaw -= i.Delta.X * 0.008
			orbit.pitch = math.clamp(orbit.pitch + i.Delta.Y * 0.006, -0.3, 0.9)
		elseif i.UserInputType == Enum.UserInputType.MouseWheel then
			orbit.dist = math.clamp(orbit.dist - i.Position.Z * 1.2, 6, 20)
		end
	end))
	Cam.own(function(_, camera)
		local r = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if not r then
			return
		end
		local target = r.Position + Vector3.new(0, 1.2, 0)
		local dir = Vector3.new(math.sin(orbit.yaw) * math.cos(orbit.pitch), math.sin(orbit.pitch), math.cos(orbit.yaw) * math.cos(orbit.pitch))
		-- shift the avatar left of the side panel
		local right = Vector3.new(math.cos(orbit.yaw), 0, -math.sin(orbit.yaw))
		local offset = UI.touch and Vector3.zero or right * -2.4
		camera.CFrame = CFrame.lookAt(target + dir * orbit.dist + offset, target + offset)
	end)

	local function send()
		state.profile.look = table.clone(look)
		state.remotes.ApplyLook:FireServer(look)
	end
	local function set(patch)
		for k, v in patch do
			look[k] = v
		end
		send()
		Customize.render()
	end

	function Customize.render()
		local b = UI.clearPanel()
		local tabs = Instance.new("Frame")
		tabs.BackgroundTransparency = 1
		tabs.Size = UDim2.new(1, 0, 0, 0)
		tabs.AutomaticSize = Enum.AutomaticSize.Y
		tabs.Parent = b
		UI.list(tabs, 6, true, true)
		for _, t in TABS do
			local btn = UI.button(tabs, t[2], function()
				tab = t[1]
				Customize.render()
			end, { auto = true, height = 34, textSize = 14, ghost = tab ~= t[1], radius = 17 })
			btn.Size = UDim2.fromOffset(0, 34)
		end
		local O = A.Options
		local function section(text, fn)
			UI.label(b, text)
			fn()
		end
		if tab == "body" then
			section("Body", function() UI.options(b, O.body, look.body, function(v) set({ body = v }) end) end)
			section("Skin tone", function() UI.swatches(b, A.Skins, look.skin, function(v) set({ skin = v }) end) end)
			section("Presets", function()
				local list = {}
				for i, p in PRESETS do
					table.insert(list, { i, p[1] })
				end
				UI.options(b, list, nil, function(i)
					local base = table.clone(A.Default)
					for k, v in PRESETS[i][2] do
						base[k] = v
					end
					look = base
					send()
					Customize.render()
				end)
			end)
		elseif tab == "hair" then
			section("Hair style", function() UI.options(b, O.hair, look.hair, function(v) set({ hair = v }) end) end)
			section("Hair colour", function() UI.swatches(b, A.HairColors, look.hairColor, function(v) set({ hairColor = v }) end) end)
		elseif tab == "top" then
			section("Top", function() UI.options(b, O.shirt, look.shirt, function(v) set({ shirt = v }) end) end)
			section("Colour", function() UI.swatches(b, A.Colors, look.shirtColor, function(v) set({ shirtColor = v }) end) end)
			section("Design", function() UI.options(b, O.pattern, look.pattern, function(v) set({ pattern = v }) end) end)
		elseif tab == "bottom" then
			section("Bottoms", function() UI.options(b, O.pants, look.pants, function(v) set({ pants = v }) end) end)
			section("Colour", function() UI.swatches(b, A.Colors, look.pantsColor, function(v) set({ pantsColor = v }) end) end)
			section("Shoes", function() UI.swatches(b, A.Colors, look.shoes, function(v) set({ shoes = v }) end) end)
		else
			section("Hat", function() UI.options(b, O.hat, look.hat, function(v) set({ hat = v }) end) end)
			if look.hat ~= "none" then
				section("Hat colour", function() UI.swatches(b, A.Colors, look.hatColor, function(v) set({ hatColor = v }) end) end)
			end
			section("Glasses", function() UI.options(b, O.glasses, look.glasses, function(v) set({ glasses = v }) end) end)
			section("Back", function() UI.options(b, O.back, look.back, function(v) set({ back = v }) end) end)
			if look.back ~= "none" then
				section("Back colour", function() UI.swatches(b, A.Colors, look.backColor, function(v) set({ backColor = v }) end) end)
			end
		end
		local row = Instance.new("Frame")
		row.BackgroundTransparency = 1
		row.Size = UDim2.new(1, 0, 0, 44)
		row.Parent = b
		local rnd = UI.button(row, "🎲 Randomise", function()
			local function pick(list)
				return list[math.random(1, #list)]
			end
			local function opt(k)
				return pick(O[k])[1]
			end
			set({
				body = opt("body"), skin = pick(A.Skins), hair = opt("hair"), hairColor = pick(A.HairColors),
				shirt = opt("shirt"), shirtColor = pick(A.Colors), pattern = opt("pattern"), pants = opt("pants"),
				pantsColor = pick(A.Colors), shoes = pick(A.Colors), hat = math.random() < 0.4 and opt("hat") or "none",
				hatColor = pick(A.Colors), glasses = math.random() < 0.3 and opt("glasses") or "none",
				back = math.random() < 0.3 and opt("back") or "none", backColor = pick(A.Colors),
			})
		end, { ghost = true, size = UDim2.new(0.5, -4, 1, 0) })
		rnd.Position = UDim2.new()
		local done = UI.button(row, "Done", function()
			UI.closePanel()
		end, { size = UDim2.new(0.5, -4, 1, 0) })
		done.Position = UDim2.new(0.5, 4, 0, 0)
		UI.text(b, "Drag to spin the camera around your avatar.", 13, Color3.fromRGB(190, 195, 210), UI.Body)
	end

	UI.openPanel({
		id = "customize", kicker = "Avatar", title = "Customise your character",
		onClose = function()
			for _, c in conns do
				c:Disconnect()
			end
			Cam.release()
		end,
	})
	Customize.render()
end

return Customize
