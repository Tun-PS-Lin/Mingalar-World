--!nonstrict
-- Applies a look (see Config.Avatar.Default) to an R15 character: body shape
-- and colours through a HumanoidDescription, clothes as part colours, and hair,
-- hats, glasses and back items as part-built Accessories (no catalogue assets).
local RS = game:GetService("ReplicatedStorage")
local U = require(RS.Shared.Util)
local Config = require(RS.Shared.Config)

local M = Enum.Material
local Avatar = {}

-- ---------------------------------------------------------------- validation
local valid = {}
for key, list in Config.Avatar.Options do
	valid[key] = {}
	for _, o in list do
		valid[key][o[1]] = true
	end
end
local colorKeys = { skin = true, hairColor = true, shirtColor = true, pantsColor = true, shoes = true, hatColor = true, backColor = true }

--- Merge an untrusted look onto the defaults, keeping only known values.
function Avatar.sanitize(look)
	local out = table.clone(Config.Avatar.Default)
	if typeof(look) ~= "table" then
		return out
	end
	for k, v in look do
		if valid[k] and typeof(v) == "string" and valid[k][v] then
			out[k] = v
		elseif colorKeys[k] and typeof(v) == "number" and v >= 0 and v <= 0xffffff then
			out[k] = math.floor(v)
		end
	end
	return out
end

-- ------------------------------------------------------------ accessories
local function accessory(name, attachName, build)
	local acc = Instance.new("Accessory")
	acc.Name = "MW_" .. name
	local handle = Instance.new("Part")
	handle.Name = "Handle"
	handle.Size = Vector3.new(0.2, 0.2, 0.2)
	handle.Transparency = 1
	handle.CanCollide = false
	handle.CanQuery = false
	handle.CanTouch = false
	handle.Massless = true
	handle.CFrame = CFrame.new()
	handle.Parent = acc
	local att = Instance.new("Attachment")
	att.Name = attachName
	att.Parent = handle
	local function P(size, offset, col, opts, shape, rot)
		local p = U.part(acc, size, CFrame.new(offset) * (rot or CFrame.identity), col, opts or { material = M.SmoothPlastic })
		if shape then
			p.Shape = shape
		end
		p.Anchored = false
		p.CanCollide = false
		p.CanQuery = false
		p.Massless = true
		local w = Instance.new("WeldConstraint")
		w.Part0 = handle
		w.Part1 = p
		w.Parent = p
		return p
	end
	build(P)
	return acc
end

local HAIR = {
	short = function(P, c)
		P(Vector3.new(1.32, 0.42, 1.32), Vector3.new(0, -0.08, 0.02), c)
		P(Vector3.new(1.3, 0.8, 0.32), Vector3.new(0, -0.5, 0.52), c)
		P(Vector3.new(0.9, 0.22, 0.26), Vector3.new(-0.15, -0.3, -0.56), c, nil, nil, CFrame.Angles(0, 0, 0.15))
	end,
	spiky = function(P, c)
		P(Vector3.new(1.3, 0.34, 1.3), Vector3.new(0, -0.1, 0.02), c)
		P(Vector3.new(1.3, 0.7, 0.3), Vector3.new(0, -0.45, 0.52), c)
		for i = 0, 5 do
			local a = i / 6 * math.pi * 2
			P(Vector3.new(0.35, 0.7, 0.35), Vector3.new(math.sin(a) * 0.35, 0.3, math.cos(a) * 0.32), c, nil, nil, CFrame.Angles(math.cos(a) * 0.5, a, 0.3))
		end
	end,
	long = function(P, c)
		P(Vector3.new(1.4, 0.42, 1.4), Vector3.new(0, -0.08, 0.02), c)
		P(Vector3.new(1.42, 1.9, 0.42), Vector3.new(0, -0.95, 0.55), c)
		for _, s in { -1, 1 } do
			P(Vector3.new(0.3, 1.5, 1), Vector3.new(s * 0.68, -0.8, 0.12), c)
		end
		P(Vector3.new(1.2, 0.26, 0.26), Vector3.new(0, -0.26, -0.56), c)
	end,
	ponytail = function(P, c)
		P(Vector3.new(1.34, 0.42, 1.34), Vector3.new(0, -0.08, 0.02), c)
		P(Vector3.new(1.3, 0.8, 0.32), Vector3.new(0, -0.5, 0.52), c)
		P(Vector3.new(0.45, 1.3, 0.45), Vector3.new(0, -0.7, 0.88), c, nil, nil, CFrame.Angles(0.3, 0, 0))
	end,
	bun = function(P, c)
		P(Vector3.new(1.34, 0.38, 1.34), Vector3.new(0, -0.08, 0.02), c)
		P(Vector3.new(1.3, 0.72, 0.32), Vector3.new(0, -0.48, 0.52), c)
		P(Vector3.new(0.8, 0.8, 0.8), Vector3.new(0, 0.28, 0.4), c, nil, Enum.PartType.Ball)
	end,
	curly = function(P, c)
		for i = 0, 11 do
			local a = i / 12 * math.pi * 2
			local r = i % 2 == 0 and 0.38 or 0.6
			P(Vector3.new(0.62, 0.62, 0.62), Vector3.new(math.sin(a) * r, 0.05 + (i % 3) * 0.08, math.cos(a) * r), c, nil, Enum.PartType.Ball)
		end
		P(Vector3.new(1.3, 0.8, 0.4), Vector3.new(0, -0.5, 0.52), c)
	end,
	mohawk = function(P, c)
		P(Vector3.new(0.28, 0.6, 1.4), Vector3.new(0, 0.18, 0), c)
	end,
}

local HATS = {
	cap = function(P, c)
		P(Vector3.new(1.38, 0.5, 1.38), Vector3.new(0, 0.12, 0.02), c)
		P(Vector3.new(1.1, 0.1, 0.8), Vector3.new(0, -0.08, -0.9), c)
	end,
	beanie = function(P, c)
		P(Vector3.new(1.42, 0.8, 1.42), Vector3.new(0, 0.2, 0.02), c, { material = M.Fabric })
		P(Vector3.new(1.46, 0.26, 1.46), Vector3.new(0, -0.08, 0.02), Color3.new(c.R * 0.75, c.G * 0.75, c.B * 0.75), { material = M.Fabric })
		P(Vector3.new(0.34, 0.34, 0.34), Vector3.new(0, 0.7, 0), U.c(0xf4f1ea), { material = M.Fabric }, Enum.PartType.Ball)
	end,
	tophat = function(P, c)
		P(Vector3.new(0.1, 2, 2), Vector3.new(0, 0.02, 0), c, nil, Enum.PartType.Cylinder, CFrame.Angles(0, 0, math.rad(90)))
		P(Vector3.new(1.2, 1.3, 1.3), Vector3.new(0, 0.66, 0), c, nil, Enum.PartType.Cylinder, CFrame.Angles(0, 0, math.rad(90)))
		P(Vector3.new(0.22, 1.34, 1.34), Vector3.new(0, 0.18, 0), U.c(0xe2483d), nil, Enum.PartType.Cylinder, CFrame.Angles(0, 0, math.rad(90)))
	end,
	crown = function(P)
		local gold = U.c(0xffc83d)
		for i = 0, 5 do
			local a = i / 6 * math.pi * 2
			P(Vector3.new(0.5, 0.4, 0.12), Vector3.new(math.sin(a) * 0.6, 0.1, math.cos(a) * 0.6), gold, { material = M.Foil, reflectance = 0.3 }, nil, CFrame.Angles(0, a, 0))
			P(Vector3.new(0.18, 0.4, 0.12), Vector3.new(math.sin(a) * 0.6, 0.45, math.cos(a) * 0.6), gold, { material = M.Foil, reflectance = 0.3 }, nil, CFrame.Angles(0, a, 0))
		end
	end,
	headphones = function(P, c)
		P(Vector3.new(1.5, 0.16, 0.24), Vector3.new(0, 0.12, 0), c)
		for _, s in { -1, 1 } do
			P(Vector3.new(0.16, 0.8, 0.24), Vector3.new(s * 0.72, -0.3, 0), c)
			P(Vector3.new(0.3, 0.56, 0.5), Vector3.new(s * 0.7, -0.72, 0), c)
		end
	end,
}

local function buildAccessories(look)
	local list = {}
	local hc = U.c(look.hairColor)
	if look.hair ~= "bald" and HAIR[look.hair] then
		table.insert(list, accessory("Hair", "HairAttachment", function(P)
			HAIR[look.hair](P, hc)
		end))
	end
	if look.hat ~= "none" and HATS[look.hat] then
		table.insert(list, accessory("Hat", "HatAttachment", function(P)
			HATS[look.hat](P, U.c(look.hatColor))
		end))
	end
	if look.glasses ~= "none" then
		table.insert(list, accessory("Glasses", "FaceFrontAttachment", function(P)
			local shades = look.glasses == "shades"
			for _, s in { -1, 1 } do
				P(Vector3.new(0.44, 0.26, 0.06), Vector3.new(s * 0.26, 0.12, -0.04), U.c(shades and 0x111111 or 0xcfe9ff), shades and { material = M.SmoothPlastic, reflectance = 0.4 } or { material = M.Glass, transparency = 0.5 })
			end
			P(Vector3.new(0.14, 0.06, 0.04), Vector3.new(0, 0.18, -0.04), U.c(0x3a2a1a))
		end))
	end
	if look.back ~= "none" then
		local c = U.c(look.backColor)
		table.insert(list, accessory("Back", "BodyBackAttachment", function(P)
			if look.back == "backpack" then
				P(Vector3.new(1.5, 1.7, 0.7), Vector3.new(0, 0, 0.35), c, { material = M.Fabric })
				P(Vector3.new(1.1, 0.6, 0.24), Vector3.new(0, -0.45, 0.78), Color3.new(c.R * 0.7, c.G * 0.7, c.B * 0.7), { material = M.Fabric })
			elseif look.back == "cape" then
				P(Vector3.new(1.9, 3.2, 0.1), Vector3.new(0, -1.1, 0.2), c, { material = M.Fabric }, nil, CFrame.Angles(0.12, 0, 0))
			else
				for _, s in { -1, 1 } do
					P(Vector3.new(0.1, 1.8, 2.6), Vector3.new(s * 1.3, 0.3, 0.4), c, { material = M.Neon, transparency = 0.2 }, nil, CFrame.Angles(0, s * 1.2, s * 0.4))
				end
			end
		end))
	end
	return list
end

-- ------------------------------------------------------------------- apply
local function description(look)
	local d = Instance.new("HumanoidDescription")
	local skin = U.c(look.skin)
	d.HeadColor, d.LeftArmColor, d.RightArmColor = skin, skin, skin
	d.TorsoColor = U.c(look.shirtColor)
	d.LeftLegColor, d.RightLegColor = U.c(look.pantsColor), U.c(look.pantsColor)
	d.Shirt, d.Pants, d.GraphicTShirt = 0, 0, 0
	d.HatAccessory, d.HairAccessory, d.FaceAccessory, d.NeckAccessory = "", "", "", ""
	d.ShouldersAccessory, d.FrontAccessory, d.BackAccessory, d.WaistAccessory = "", "", "", ""
	-- blocky default R15 body parts give the classic Roblox look
	d.Head, d.Torso, d.LeftArm, d.RightArm, d.LeftLeg, d.RightLeg = 0, 0, 0, 0, 0, 0
	if look.body == "female" then
		d.HeightScale, d.WidthScale, d.DepthScale = 0.96, 0.88, 0.92
		d.ProportionScale, d.BodyTypeScale = 0.4, 0.35
	else
		d.HeightScale, d.WidthScale, d.DepthScale = 1, 1, 1
		d.ProportionScale, d.BodyTypeScale = 0, 0
	end
	return d
end
Avatar.description = description

--- Colour individual body parts so the clothes read properly (sleeves, shorts...).
local function paint(char, look)
	local skin, shirt, pants, shoes = U.c(look.skin), U.c(look.shirtColor), U.c(look.pantsColor), U.c(look.shoes)
	local function set(name, col)
		local p = char:FindFirstChild(name)
		if p and p:IsA("BasePart") then
			p.Color = col
		end
	end
	local dress = look.shirt == "dress"
	set("UpperTorso", shirt)
	set("LowerTorso", dress and shirt or pants)
	for _, s in { "Left", "Right" } do
		set(s .. "UpperArm", look.shirt == "tank" and skin or shirt)
		set(s .. "LowerArm", (look.shirt == "hoodie" or look.shirt == "jacket") and shirt or skin)
		set(s .. "Hand", skin)
		local bareLegs = dress or look.pants == "skirt" or look.pants == "shorts"
		set(s .. "UpperLeg", dress and skin or (look.pants == "skirt" and skin or pants))
		set(s .. "LowerLeg", bareLegs and skin or pants)
		set(s .. "Foot", shoes)
	end
	-- old extras
	for _, d in char:GetChildren() do
		if d.Name:sub(1, 3) == "MW_" then
			d:Destroy()
		end
	end
	local upper = char:FindFirstChild("UpperTorso")
	local lower = char:FindFirstChild("LowerTorso")
	if upper then
		for _, g in upper:GetChildren() do
			if g.Name == "MW_Design" then
				g:Destroy()
			end
		end
		-- shirt design on the chest
		if look.pattern ~= "plain" then
			local g = Instance.new("SurfaceGui")
			g.Name = "MW_Design"
			g.Face = Enum.NormalId.Front
			g.Parent = upper
			if look.pattern == "stripes" then
				for i = 0, 3 do
					local f = Instance.new("Frame")
					f.BorderSizePixel = 0
					f.BackgroundColor3 = Color3.new(1, 1, 1)
					f.BackgroundTransparency = 0.15
					f.Size = UDim2.fromScale(1, 0.1)
					f.Position = UDim2.fromScale(0, 0.12 + i * 0.22)
					f.Parent = g
				end
			else
				local t = Instance.new("TextLabel")
				t.BackgroundTransparency = 1
				t.Size = UDim2.fromScale(0.7, 0.7)
				t.Position = UDim2.fromScale(0.15, 0.12)
				t.TextScaled = true
				t.Font = Enum.Font.FredokaOne
				t.Text = ({ logo = "MW", star = "★", heart = "♥" })[look.pattern] or ""
				t.TextColor3 = look.pattern == "heart" and Color3.fromRGB(255, 77, 109) or (look.shirtColor == 0xf4f1ea and Color3.fromRGB(20, 24, 43) or Color3.new(1, 1, 1))
				t.Parent = g
			end
		end
		if look.shirt == "hoodie" or look.shirt == "jacket" then
			local col = look.shirt == "jacket" and Color3.new(shirt.R * 0.7, shirt.G * 0.7, shirt.B * 0.7) or Color3.new(shirt.R * 0.85, shirt.G * 0.85, shirt.B * 0.85)
			local hood = U.part(char, Vector3.new(1.6, 0.6, 0.5), upper.CFrame * CFrame.new(0, 0.75, 0.45), col, { material = M.Fabric })
			hood.Name = "MW_Hood"
			hood.Anchored, hood.CanCollide, hood.CanQuery, hood.Massless = false, false, false, true
			local w = Instance.new("WeldConstraint")
			w.Part0, w.Part1 = upper, hood
			w.Parent = hood
		end
	end
	if lower and (dress or look.pants == "skirt") then
		local col = dress and shirt or pants
		local skirt = U.part(char, Vector3.new(2.3, dress and 1.6 or 1.1, 1.4), lower.CFrame * CFrame.new(0, dress and -0.75 or -0.5, 0), col, { material = M.Fabric })
		skirt.Name = "MW_Skirt"
		skirt.Anchored, skirt.CanCollide, skirt.CanQuery, skirt.Massless = false, false, false, true
		local w = Instance.new("WeldConstraint")
		w.Part0, w.Part1 = lower, skirt
		w.Parent = skirt
	end
end

-- exposed for the headless tests (tools/test.luau)
Avatar._accessories = buildAccessories
Avatar._paint = paint

--- Apply a (sanitised) look to a character model with an R15 Humanoid.
function Avatar.applyToCharacter(char: Model, look)
	local hum = char:FindFirstChildOfClass("Humanoid")
	if not hum or hum.RigType ~= Enum.HumanoidRigType.R15 then
		return false
	end
	local ok, err = pcall(function()
		hum:ApplyDescription(description(look))
	end)
	if not ok then
		warn("ApplyDescription failed:", err)
	end
	paint(char, look)
	for _, acc in buildAccessories(look) do
		hum:AddAccessory(acc)
	end
	return true
end

return Avatar
