--!nonstrict
-- Gun models for the range. Built around a Handle at the grip: with the default
-- Tool grip the Handle's LookVector points where the character aims, so the
-- barrel runs along -Z and the body sits above the grip.
local U = require(script.Parent.Util)

local M = Enum.Material
local GunModel = {}

local function weld(handle, p)
	p.Anchored = false
	p.Massless = true
	p.CanCollide = false
	p.CanQuery = false
	p.CanTouch = false
	local w = Instance.new("WeldConstraint")
	w.Part0 = handle
	w.Part1 = p
	w.Parent = p
	return p
end

--- Returns a Tool (server) or a loose Model (display), plus the muzzle Attachment.
function GunModel.build(id: string, asTool: boolean)
	local container = asTool and Instance.new("Tool") or Instance.new("Model")
	container.Name = id
	local handle = Instance.new("Part")
	handle.Name = "Handle"
	handle.Size = Vector3.new(0.3, 0.7, 0.4)
	handle.Color = U.c(0x23262f)
	handle.Material = M.Metal
	handle.CanCollide = false
	handle.Massless = true
	handle.Parent = container
	local base = handle.CFrame
	local function P(size, offset: Vector3, col, mat, rot)
		local p = U.part(container, size, base * CFrame.new(offset) * (rot or CFrame.identity), col or 0x23262f, { material = mat or M.Metal })
		return weld(handle, p)
	end
	local function barrel(len, r, z, y)
		local p = U.cylCF(container, r, len, base * CFrame.new(0, y or 0.4, z - len / 2) * CFrame.Angles(0, math.rad(90), 0), 0x8b919c, { material = M.Metal })
		return weld(handle, p)
	end
	local muzzleZ = -1
	if id == "pistol" then
		P(Vector3.new(0.26, 0.3, 1.1), Vector3.new(0, 0.42, -0.3))
		muzzleZ = -0.9
	elseif id == "revolver" then
		barrel(1, 0.09, -0.2, 0.42)
		local cyl = U.cylCF(container, 0.2, 0.36, base * CFrame.new(0, 0.38, -0.05) * CFrame.Angles(0, math.rad(90), 0), 0x8b919c, { material = M.Metal })
		weld(handle, cyl)
		handle.Color = U.c(0x7a4a26)
		handle.Material = M.Wood
		muzzleZ = -1.2
	elseif id == "smg" then
		P(Vector3.new(0.3, 0.42, 1.5), Vector3.new(0, 0.42, -0.45))
		P(Vector3.new(0.2, 0.8, 0.24), Vector3.new(0, -0.05, -0.85))
		barrel(0.5, 0.07, -1.2, 0.48)
		P(Vector3.new(0.14, 0.14, 0.8), Vector3.new(0, 0.5, 0.75), 0x8b919c)
		muzzleZ = -1.7
	elseif id == "rifle" then
		P(Vector3.new(0.3, 0.46, 2.2), Vector3.new(0, 0.42, -0.5))
		P(Vector3.new(0.24, 0.9, 0.36), Vector3.new(0, -0.1, -0.95), nil, nil, CFrame.Angles(math.rad(-10), 0, 0))
		P(Vector3.new(0.3, 0.46, 1.1), Vector3.new(0, 0.3, 1.1))
		barrel(1.1, 0.08, -1.6, 0.48)
		P(Vector3.new(0.18, 0.24, 0.42), Vector3.new(0, 0.8, -0.3))
		local dot = P(Vector3.new(0.12, 0.12, 0.04), Vector3.new(0, 0.86, -0.08), 0xff3b30, M.Neon)
		dot.Name = "RedDot"
		muzzleZ = -2.7
	elseif id == "shotgun" then
		barrel(2.4, 0.1, -0.4, 0.5)
		barrel(2.1, 0.08, -0.4, 0.3)
		P(Vector3.new(0.3, 0.36, 0.9), Vector3.new(0, 0.4, 0))
		P(Vector3.new(0.3, 0.55, 1.3), Vector3.new(0, 0.2, 1.05), 0x7a4a26, M.Wood)
		P(Vector3.new(0.34, 0.3, 0.7), Vector3.new(0, 0.3, -1.3), 0x7a4a26, M.Wood)
		muzzleZ = -2.8
	elseif id == "sniper" then
		P(Vector3.new(0.3, 0.42, 2.1), Vector3.new(0, 0.42, -0.3), 0x4a5236)
		P(Vector3.new(0.3, 0.52, 1.3), Vector3.new(0, 0.25, 1.35), 0x4a5236)
		barrel(2.4, 0.07, -1.3, 0.48)
		local scope = U.cylCF(container, 0.14, 1.5, base * CFrame.new(0, 0.85, -0.3) * CFrame.Angles(0, math.rad(90), 0), 0x23262f, { material = M.Metal })
		weld(handle, scope)
		muzzleZ = -3.7
	end
	for _, d in container:GetDescendants() do
		if d:IsA("BasePart") then
			d.CastShadow = false
		end
	end
	local muzzle = Instance.new("Attachment")
	muzzle.Name = "Muzzle"
	muzzle.Position = Vector3.new(0, 0.45, muzzleZ)
	muzzle.Parent = handle
	if asTool then
		container.CanBeDropped = false
		container.RequiresHandle = true
		container.Grip = CFrame.new(0, -0.1, 0.1)
	end
	return container, muzzle
end

return GunModel
