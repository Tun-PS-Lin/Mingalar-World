--!nocheck
-- Sanity-check a built place file:   lune run tools/inspect-place.luau MingalarWorld.rbxl
local fs = require("@lune/fs")
local process = require("@lune/process")
local roblox = require("@lune/roblox")
local path = process.args[1] or "MingalarWorld.rbxl"
local game = roblox.deserializePlace(fs.readFile(path))
local ws = game:GetService("Workspace")
local map = ws:FindFirstChild("Map")
local parts, prompts, guis, tagged = 0, 0, 0, {}
for _, d in (map and map:GetDescendants() or {}) do
	if d:IsA("BasePart") then
		parts += 1
	elseif d.ClassName == "ProximityPrompt" then
		prompts += 1
	elseif d.ClassName == "SurfaceGui" then
		guis += 1
	end
	for _, t in d:GetTags() do
		tagged[t] = (tagged[t] or 0) + 1
	end
end
local scripts = {}
for _, d in game:GetDescendants() do
	if d.ClassName == "Script" or d.ClassName == "LocalScript" or d.ClassName == "ModuleScript" then
		table.insert(scripts, d.ClassName:sub(1, 1) .. ":" .. d.Name)
	end
end
table.sort(scripts)
print("Map:", map and "present" or "MISSING", "parts", parts, "prompts", prompts, "surface guis", guis)
local t = {}
for k, v in tagged do
	table.insert(t, k .. "=" .. v)
end
print("Tags:", table.concat(t, " "))
print("Scripts:", #scripts, table.concat(scripts, " "))
print("StreamingEnabled:", ws.StreamingEnabled, "Lighting.Technology:", game:GetService("Lighting").Technology)
