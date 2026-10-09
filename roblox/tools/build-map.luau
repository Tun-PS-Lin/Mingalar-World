--!nocheck
-- Pre-builds the map: runs the server world builders under Lune (a standalone
-- Luau runtime with Roblox's data types) and saves the result as build/Map.rbxm,
-- which the Rojo project places at Workspace.Map. Servers then skip building.
--
--   lune run tools/build-map.luau
--
-- It doubles as a test: any runtime error in the builders fails the script,
-- and it prints the part count per area.
local fs = require("@lune/fs")
local process = require("@lune/process")
local L = require("./lib/loader")
L.install()
local roblox = L.roblox
local Instance = roblox.Instance
local Server, requireNode, parts = L.Server, L.require, L.parts

-- ------------------------------------------------------------------ build
local World = Server.World
local map = Instance.new("Model")
map.Name = "Map"
local counts = {}
local order = { "City", "Mall", "Garage", "Office", "GunRange", "Track" }
for _, name in order do
	local before = #parts(map)
	local ok, err = pcall(function()
		requireNode(World[name]).build(map)
	end)
	if not ok then
		print("BUILD FAILED in " .. name .. ": " .. tostring(err))
		process.exit(1)
	end
	counts[name] = #parts(map) - before
end
-- terrain painters should run too (as no-ops here) so they are exercised
requireNode(World.City).terrain()
requireNode(World.Track).terrain()

local total = #parts(map)
for _, name in order do
	print(("  %-10s %6d parts"):format(name, counts[name]))
end
print(("  %-10s %6d parts, %d terrain fills"):format("TOTAL", total, L.terrainCalls))
local tagList = {}
for t, n in L.tags do
	table.insert(tagList, t .. "=" .. n)
end
print("  tags: " .. table.concat(tagList, ", "))
fs.writeDir("build")
fs.writeFile("build/Map.rbxm", roblox.serializeModel({ map }))
print("Wrote build/Map.rbxm")
