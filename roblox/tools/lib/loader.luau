--!nocheck
-- Runs the project's ModuleScripts under Lune: polyfills the engine methods
-- Lune lacks and mirrors the Rojo tree so `require(script.Parent.X)` and
-- `game:GetService("ReplicatedStorage").Shared.X` resolve to the source files.
local roblox = require("@lune/roblox")
local fs = require("@lune/fs")
local luau = require("@lune/luau")

local Instance, CFrame, Vector3 = roblox.Instance, roblox.CFrame, roblox.Vector3
local L = { roblox = roblox, terrainCalls = 0, tags = {} }

-- ------------------------------------------------- engine methods Lune lacks
local function parts(model)
	local out = {}
	for _, d in model:GetDescendants() do
		if d:IsA("BasePart") then
			table.insert(out, d)
		end
	end
	return out
end
local function getPivot(model)
	if model.PrimaryPart then
		return model.PrimaryPart.CFrame
	end
	local list = parts(model)
	if #list == 0 then
		return CFrame.new()
	end
	local sum = Vector3.zero
	for _, p in list do
		sum += p.CFrame.Position
	end
	return CFrame.new(sum / #list)
end
--- Lune can't register engine polyfills from inside a required module, so the
--- calling script runs this.
function L.install()
	roblox.implementMethod("Model", "GetPivot", getPivot)
	roblox.implementMethod("Model", "PivotTo", function(model, cf)
		local delta = cf * getPivot(model):Inverse()
		for _, p in parts(model) do
			p.CFrame = delta * p.CFrame
		end
	end)
	roblox.implementMethod("Model", "ScaleTo", function(model, s)
		local pivot = getPivot(model)
		for _, p in parts(model) do
			local rel = pivot:ToObjectSpace(p.CFrame)
			p.Size = p.Size * s
			p.CFrame = pivot * (CFrame.new(rel.Position * s) * (rel - rel.Position))
		end
	end)
end

-- ------------------------------------------------------------- fake engine
local Random = {}
Random.__index = Random
function Random.new(seed)
	local self = setmetatable({ s = (seed or 1) % 2147483647 }, Random)
	if self.s <= 0 then
		self.s += 2147483646
	end
	return self
end
function Random:NextNumber(a, b)
	self.s = (self.s * 16807) % 2147483647
	local r = self.s / 2147483647
	if a then
		return a + (b - a) * r
	end
	return r
end
function Random:NextInteger(a, b)
	return math.floor(self:NextNumber(a, b + 1))
end

local tags = L.tags
local CollectionService = {
	AddTag = function(_, inst, tag)
		inst:AddTag(tag)
		tags[tag] = (tags[tag] or 0) + 1
	end,
	GetTagged = function()
		return {}
	end,
}
local Terrain = setmetatable({}, { __index = function()
	return function()
		L.terrainCalls += 1
	end
end })
local fakeWorkspace = { Terrain = Terrain }

-- virtual module tree mirroring the Rojo layout
local root = "src/"
local function node(name, path, parent)
	return { Name = name, __path = path, Parent = parent, __children = {} }
end
local function mount(dirPath, parentNode)
	for _, entry in fs.readDir(dirPath) do
		local full = dirPath .. "/" .. entry
		if fs.isDir(full) then
			local n = node(entry, nil, parentNode)
			parentNode.__children[entry] = n
			mount(full, n)
		elseif entry:match("%.luau$") and not entry:match("%.server%.luau$") and not entry:match("%.client%.luau$") then
			local name = entry:gsub("%.luau$", "")
			parentNode.__children[name] = node(name, full, parentNode)
		end
	end
end
local meta = { __index = function(t, k)
	return rawget(t, "__children")[k]
end }
local function seal(n)
	setmetatable(n, meta)
	for _, c in n.__children do
		seal(c)
	end
end
local Shared = node("Shared", nil, nil)
mount(root .. "shared", Shared)
local Server = node("Server", nil, nil)
mount(root .. "server", Server)
seal(Shared)
seal(Server)
local RS = { Shared = Shared }

local game = {
	GetService = function(_, name)
		if name == "ReplicatedStorage" then
			return RS
		elseif name == "CollectionService" then
			return CollectionService
		elseif name == "Players" then
			return {}
		end
		error("service not mocked: " .. name)
	end,
}

local cache = {}
local function requireNode(n)
	if cache[n] then
		return cache[n]
	end
	assert(n and n.__path, "require of unknown module")
	local env = {
		script = n, game = game, workspace = fakeWorkspace, require = requireNode, Random = Random,
		warn = function(...)
			print("WARN", ...)
		end,
	}
	for k, v in roblox do
		env[k] = v
	end
	local fn = luau.load(fs.readFile(n.__path), { debugName = n.__path, environment = env })
	local result = fn()
	cache[n] = result
	return result
end


L.Shared, L.Server, L.require, L.parts = Shared, Server, requireNode, parts
return L
