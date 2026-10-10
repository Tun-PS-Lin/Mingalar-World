--!nonstrict
-- A few townsfolk strolling round the pavements. They are built from random
-- looks with the same avatar code as players and walk with Humanoid:MoveTo.
local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local Config = require(RS.Shared.Config)
local Avatar = require(script.Parent.Avatar)

local Npcs = {}

-- default R15 walk / idle animations
local WALK = "rbxassetid://507777826"
local IDLE = "rbxassetid://507766666"

local E = 1.8
local LOOPS = {
	{ -292 + E, -14 - E, -252 + E, -14 - E },
	{ 14 + E, 292 - E, -252 + E, -14 - E },
	{ -292 + E, -14 - E, 14 + E, 252 - E },
	{ 14 + E, 292 - E, 14 + E, 252 - E },
}

local function randomLook(r)
	local A = Config.Avatar
	local function pick(list)
		return list[r:NextInteger(1, #list)]
	end
	local female = r:NextNumber() < 0.5
	return Avatar.sanitize({
		body = female and "female" or "male",
		skin = pick(A.Skins),
		hair = female and pick({ "long", "ponytail", "bun", "curly" }) or pick({ "short", "spiky", "curly", "mohawk" }),
		hairColor = pick(A.HairColors),
		shirt = pick({ "tee", "hoodie", "jacket" }),
		shirtColor = pick(A.Colors),
		pattern = pick({ "plain", "logo", "star", "stripes" }),
		pants = female and pick({ "jeans", "skirt", "shorts" }) or pick({ "jeans", "shorts" }),
		pantsColor = pick(A.Colors),
		shoes = pick(A.Colors),
		hat = r:NextNumber() < 0.3 and pick({ "cap", "beanie" }) or "none",
		hatColor = pick(A.Colors),
		glasses = r:NextNumber() < 0.2 and "shades" or "none",
	})
end

function Npcs.spawn(parent: Instance, count: number)
	local folder = Instance.new("Folder")
	folder.Name = "Townsfolk"
	folder.Parent = parent
	local r = Random.new(2024)
	for i = 1, count do
		task.spawn(function()
			local look = randomLook(r)
			local ok, model = pcall(function()
				return Players:CreateHumanoidModelFromDescription(Avatar.description(look), Enum.HumanoidRigType.R15)
			end)
			if not ok or not model then
				warn("Could not create townsperson:", model)
				return
			end
			model.Name = "Townsperson"
			local loop = LOOPS[(i - 1) % #LOOPS + 1]
			local corners = {
				Vector3.new(loop[1], 0, loop[3]), Vector3.new(loop[2], 0, loop[3]),
				Vector3.new(loop[2], 0, loop[4]), Vector3.new(loop[1], 0, loop[4]),
			}
			local start = corners[(i % 4) + 1]
			model:PivotTo(CFrame.new(start + Vector3.new(0, 4, 0)))
			model.Parent = folder
			Avatar.applyToCharacter(model, look)
			local hum = model:FindFirstChildOfClass("Humanoid")
			hum.WalkSpeed = 7 + r:NextNumber() * 3
			hum.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
			-- the townsfolk are cosmetic: players walk through them
			for _, p in model:GetDescendants() do
				if p:IsA("BasePart") then
					p.CollisionGroup = "Townsfolk"
				end
			end
			local animator = hum:FindFirstChildOfClass("Animator") or Instance.new("Animator", hum)
			local function track(id)
				local a = Instance.new("Animation")
				a.AnimationId = id
				return animator:LoadAnimation(a)
			end
			local walk, idle = track(WALK), track(IDLE)
			idle:Play()
			local dir = i % 2 == 0 and 1 or -1
			local k = (i % 4) + 1
			while model.Parent do
				k = (k - 1 + dir) % 4 + 1
				walk:Play()
				-- MoveTo gives up after 8 s, so keep re-issuing it until we arrive
				local root = model:FindFirstChild("HumanoidRootPart")
				for _ = 1, 20 do
					hum:MoveTo(corners[k])
					hum.MoveToFinished:Wait()
					if not root or (root.Position * Vector3.new(1, 0, 1) - corners[k]).Magnitude < 3 then
						break
					end
				end
				walk:Stop()
				task.wait(0.5 + r:NextNumber() * 2)
			end
		end)
	end
end

return Npcs
