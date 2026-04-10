(function () {
    'use strict';

    const API_DUMP_URL = 'https://raw.githubusercontent.com/MaximumADHD/Roblox-Client-Tracker/roblox/API-Dump.json';

    const DEFAULT_SERVICES = [
        'AdService', 'AnalyticsService', 'AnimationClipProvider', 'AssetService', 'AvatarCreationService',
        'AvatarEditorService', 'BadgeService', 'BrowserService', 'CaptureService', 'ChangeHistoryService',
        'Chat', 'CollectionService', 'ContentProvider', 'ContextActionService', 'ControllerService',
        'Debris', 'FriendService', 'GamepadService', 'GroupService', 'GuiService',
        'HapticService', 'HttpService', 'InsertService', 'Lighting', 'LocalizationService',
        'LogService', 'MarketplaceService', 'MaterialService', 'MeshContentProvider', 'NetworkClient',
        'NotificationService', 'PathfindingService', 'PhysicsService', 'Players', 'PointsService',
        'PolicyService', 'ProximityPromptService', 'ReplicatedFirst', 'ReplicatedStorage', 'RunService',
        'ScriptContext', 'Selection', 'ServerScriptService', 'ServerStorage', 'SoundService',
        'StarterGui', 'StarterPack', 'StarterPlayer', 'Stats', 'Teams',
        'TeleportService', 'TestService', 'TextChatService', 'TextService', 'TweenService',
        'UserInputService', 'UserService', 'VRService', 'VideoCaptureService', 'VoiceChatService',
        'Workspace'
    ];

    const DEFAULT_INSTANCES = [
        'Accessory', 'Animation', 'AnimationController', 'Attachment', 'Beam',
        'BindableEvent', 'BindableFunction', 'BoolValue', 'Camera', 'ClickDetector',
        'Color3Value', 'Decal', 'Folder', 'Frame', 'Highlight',
        'ImageLabel', 'ImageButton', 'IntValue', 'LocalScript', 'Model',
        'ModuleScript', 'Motor6D', 'NumberValue', 'ObjectValue', 'ParticleEmitter',
        'Part', 'RemoteEvent', 'RemoteFunction', 'ScreenGui', 'Script',
        'Sound', 'StringValue', 'TextButton', 'TextLabel', 'TextBox',
        'Tool', 'UIListLayout', 'UIPadding', 'UIGradient', 'UIScale',
        'WeldConstraint'
    ];

    const DEFAULT_ENUMS = [
        'AccessModifierType', 'ActuatorRelativeTo', 'ActuatorType', 'ActionType', 'AlignmentMode',
        'AnimationPriority', 'ApplyStrokeMode', 'AutomaticSize', 'Axis', 'BinType',
        'BodyPart', 'BrickColor', 'CageType', 'CameraMode', 'CameraType',
        'ChatColor', 'DataStoreRequestType', 'DepthOfFieldMode', 'DeviceType', 'EasingDirection',
        'EasingStyle', 'ExplosionType', 'FieldOfViewMode', 'FillDirection', 'Font',
        'FrameStyle', 'HorizontalAlignment', 'HumanoidDisplayDistanceType', 'HumanoidHealthDisplayType', 'HumanoidRigType',
        'KeyCode', 'LineJoinMode', 'Material', 'MeshPartDetailLevel', 'MouseBehavior',
        'NormalId', 'OrientationAlignmentMode', 'PartType', 'PathStatus', 'Platform',
        'PoseEasingDirection', 'PoseEasingStyle', 'RaycastFilterType', 'RenderPriority', 'ResamplerMode',
        'ScaleType', 'ScreenOrientation', 'SelectionBehavior', 'SoundType', 'StudioStyleGuideColor',
        'TextDirection', 'TextTruncate', 'TextXAlignment', 'TextYAlignment', 'ThreadPoolConfig',
        'ThumbnailType', 'TweenStatus', 'UITheme', 'VerticalAlignment', 'ZIndexBehavior'
    ];

    const LUA_KEYWORDS = [
        'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function', 'if', 'in',
        'local', 'nil', 'not', 'or', 'repeat', 'return', 'then', 'true', 'until', 'while', 'continue'
    ];

    const BASE_LUA_GLOBALS = [
        { label: 'game', kind: 'Variable', detail: 'Roblox Global', documentation: 'DataModel root instance.' },
        { label: 'workspace', kind: 'Variable', detail: 'Roblox Global', documentation: 'Workspace service.' },
        { label: 'script', kind: 'Variable', detail: 'Roblox Global', documentation: 'Currently-running script instance.' },
        { label: 'shared', kind: 'Variable', detail: 'Roblox Global', documentation: 'Shared cross-script table for the same execution context.' },
        { label: 'Enum', kind: 'Variable', detail: 'Roblox Global', documentation: 'Root enum table.' },
        { label: 'Instance', kind: 'Class', detail: 'Roblox Constructor', documentation: 'Construct new Roblox objects via Instance.new().' },
        { label: 'print', kind: 'Function', detail: 'Lua Global', documentation: 'Print values to output.', insertText: 'print(${0})', snippet: true },
        { label: 'warn', kind: 'Function', detail: 'Roblox Global', documentation: 'Print warning message to output.', insertText: 'warn(${0})', snippet: true },
        { label: 'error', kind: 'Function', detail: 'Lua Global', documentation: 'Raise an error.', insertText: 'error(${1:message})', snippet: true },
        { label: 'require', kind: 'Function', detail: 'Roblox Global', documentation: 'Require ModuleScript by instance or asset id.', insertText: 'require(${0})', snippet: true },
        { label: 'assert', kind: 'Function', detail: 'Lua Global', documentation: 'Validate expression and throw if false.', insertText: 'assert(${1:value}, ${2:message})', snippet: true },
        { label: 'task', kind: 'Module', detail: 'Roblox Task Library', documentation: 'Scheduling functions: task.spawn, task.wait, task.delay.' },
        { label: 'string', kind: 'Module', detail: 'Lua String Library', documentation: 'String manipulation library.' },
        { label: 'table', kind: 'Module', detail: 'Lua Table Library', documentation: 'Table helpers.' },
        { label: 'math', kind: 'Module', detail: 'Lua Math Library', documentation: 'Math functions.' },
        { label: 'os', kind: 'Module', detail: 'Lua OS Library', documentation: 'Time/date functions.' },
        { label: 'coroutine', kind: 'Module', detail: 'Lua Coroutine Library', documentation: 'Coroutines and yielding.' },
        { label: 'debug', kind: 'Module', detail: 'Luau Debug Library', documentation: 'Runtime/stack inspection helpers.' },
        { label: 'bit32', kind: 'Module', detail: 'Lua Bit Library', documentation: 'Bitwise helpers.' }
    ];

    const EXTRA_LUA_GLOBALS = [
        { label: 'LocalPlayer', kind: 'Variable', detail: 'Roblox Global', documentation: 'Client-side Player in LocalScripts.' },
        { label: '_G', kind: 'Variable', detail: 'Lua Global', documentation: 'Global shared table for same context scripts.', insertText: '_G.${0}', snippet: true },
        { label: '_VERSION', kind: 'Variable', detail: 'Lua Global', documentation: 'Current Lua interpreter version string.' },
        { label: 'collectgarbage', kind: 'Function', detail: 'Lua Global', documentation: 'Control/query Lua garbage collector.', insertText: 'collectgarbage(${1:"count"})', snippet: true },
        { label: 'gcinfo', kind: 'Function', detail: 'Roblox Global (Deprecated)', documentation: 'Deprecated memory usage function.', insertText: 'gcinfo()', snippet: true },
        { label: 'getfenv', kind: 'Function', detail: 'Lua Global', documentation: 'Get function environment (deprecated in Luau).', insertText: 'getfenv(${1:target})', snippet: true },
        { label: 'setfenv', kind: 'Function', detail: 'Lua Global', documentation: 'Set function environment (deprecated in Luau).', insertText: 'setfenv(${1:target}, ${2:env})', snippet: true },
        { label: 'getmetatable', kind: 'Function', detail: 'Lua Global', documentation: 'Get table metatable.', insertText: 'getmetatable(${1:value})', snippet: true },
        { label: 'setmetatable', kind: 'Function', detail: 'Lua Global', documentation: 'Set table metatable.', insertText: 'setmetatable(${1:tbl}, ${2:metatable})', snippet: true },
        { label: 'ipairs', kind: 'Function', detail: 'Lua Global', documentation: 'Iterator over array portion of table.', insertText: 'ipairs(${1:tbl})', snippet: true },
        { label: 'pairs', kind: 'Function', detail: 'Lua Global', documentation: 'Iterator over key/value table pairs.', insertText: 'pairs(${1:tbl})', snippet: true },
        { label: 'next', kind: 'Function', detail: 'Lua Global', documentation: 'Return next key/value in table.', insertText: 'next(${1:tbl}, ${2:key})', snippet: true },
        { label: 'rawequal', kind: 'Function', detail: 'Lua Global', documentation: 'Compare values without metamethods.', insertText: 'rawequal(${1:a}, ${2:b})', snippet: true },
        { label: 'rawget', kind: 'Function', detail: 'Lua Global', documentation: 'Table lookup without metamethods.', insertText: 'rawget(${1:tbl}, ${2:key})', snippet: true },
        { label: 'rawset', kind: 'Function', detail: 'Lua Global', documentation: 'Table set without metamethods.', insertText: 'rawset(${1:tbl}, ${2:key}, ${3:value})', snippet: true },
        { label: 'select', kind: 'Function', detail: 'Lua Global', documentation: 'Select arguments from vararg list.', insertText: 'select(${1:index}, ${2:...})', snippet: true },
        { label: 'tonumber', kind: 'Function', detail: 'Lua Global', documentation: 'Convert value to number.', insertText: 'tonumber(${1:value}, ${2:base})', snippet: true },
        { label: 'tostring', kind: 'Function', detail: 'Lua Global', documentation: 'Convert value to string.', insertText: 'tostring(${1:value})', snippet: true },
        { label: 'type', kind: 'Function', detail: 'Lua Global', documentation: 'Return basic Lua type.', insertText: 'type(${1:value})', snippet: true },
        { label: 'typeof', kind: 'Function', detail: 'Roblox Global', documentation: 'Return Luau/Roblox type.', insertText: 'typeof(${1:value})', snippet: true },
        { label: 'unpack', kind: 'Function', detail: 'Lua Global', documentation: 'Return array values.', insertText: 'unpack(${1:list}, ${2:start}, ${3:finish})', snippet: true },
        { label: 'xpcall', kind: 'Function', detail: 'Lua Global', documentation: 'Protected function call with custom error handler.', insertText: 'xpcall(${1:func}, ${2:errorHandler}, ${3:...})', snippet: true },
        { label: 'ypcall', kind: 'Function', detail: 'Lua Global (Deprecated)', documentation: 'Deprecated protected call alias.', insertText: 'ypcall(${1:func}, ${2:...})', snippet: true },
        { label: 'loadstring', kind: 'Function', detail: 'Lua Global', documentation: 'Compile string source into function.', insertText: 'loadstring(${1:source})', snippet: true },
        { label: 'newproxy', kind: 'Function', detail: 'Lua Global', documentation: 'Create blank userdata (legacy).', insertText: 'newproxy(${1:true})', snippet: true },
        { label: 'delay', kind: 'Function', detail: 'Roblox Global', documentation: 'Schedule callback after delay (deprecated by task.delay).', insertText: 'delay(${1:seconds}, ${2:callback})', snippet: true },
        { label: 'elapsedTime', kind: 'Function', detail: 'Roblox Global', documentation: 'Elapsed time since Roblox start.', insertText: 'elapsedTime()', snippet: true },
        { label: 'printidentity', kind: 'Function', detail: 'Roblox Global', documentation: 'Print current thread identity.', insertText: 'printidentity(${1:prefix})', snippet: true },
        { label: 'settings', kind: 'Function', detail: 'Roblox Global', documentation: 'Return GlobalSettings object.', insertText: 'settings()', snippet: true },
        { label: 'spawn', kind: 'Function', detail: 'Roblox Global (Deprecated)', documentation: 'Schedule callback in next scheduler step.', insertText: 'spawn(${1:callback})', snippet: true },
        { label: 'stats', kind: 'Function', detail: 'Roblox Global (Deprecated)', documentation: 'Deprecated Stats accessor.', insertText: 'stats()', snippet: true },
        { label: 'tick', kind: 'Function', detail: 'Roblox Global (Legacy)', documentation: 'Return local Unix timestamp in seconds.', insertText: 'tick()', snippet: true },
        { label: 'time', kind: 'Function', detail: 'Roblox Global', documentation: 'Return elapsed game instance time.', insertText: 'time()', snippet: true },
        { label: 'UserSettings', kind: 'Function', detail: 'Roblox Global', documentation: 'Return UserSettings object.', insertText: 'UserSettings()', snippet: true },
        { label: 'version', kind: 'Function', detail: 'Roblox Global', documentation: 'Return Roblox version string.', insertText: 'version()', snippet: true },
        { label: 'wait', kind: 'Function', detail: 'Roblox Global (Deprecated)', documentation: 'Yield current thread for duration.', insertText: 'wait(${1:seconds})', snippet: true },
        { label: 'WebSocket', kind: 'Class', detail: 'Executor WebSocket', documentation: 'WebSocket helper table exposed by executor.' },
        { label: 'Drawing', kind: 'Class', detail: 'Executor Drawing', documentation: 'Drawing API root object.' },
        { label: 'bit', kind: 'Module', detail: 'Lua BitOp', documentation: 'Bit library from Lua BitOp implementations.' }
    ];

    const LUA_GLOBALS = mergeUniqueEntries(BASE_LUA_GLOBALS.concat(EXTRA_LUA_GLOBALS));

    const LUA_SNIPPETS = [
        {
            label: 'local',
            kind: 'Snippet',
            detail: 'Local Variable',
            documentation: 'Declare a local variable.',
            insertText: 'local ${1:name} = ${0:value}',
            snippet: true
        },
        {
            label: 'if',
            kind: 'Snippet',
            detail: 'Conditional Block',
            documentation: 'if/then/end block.',
            insertText: 'if ${1:condition} then\n\t${0}\nend',
            snippet: true
        },
        {
            label: 'if else',
            kind: 'Snippet',
            detail: 'Conditional Branch',
            documentation: 'if/then/else block.',
            insertText: 'if ${1:condition} then\n\t${2}\nelse\n\t${0}\nend',
            snippet: true
        },
        {
            label: 'for',
            kind: 'Snippet',
            detail: 'Numeric For Loop',
            documentation: 'Loop over numeric range.',
            insertText: 'for ${1:i} = ${2:1}, ${3:10}, ${4:1} do\n\t${0}\nend',
            snippet: true
        },
        {
            label: 'for in',
            kind: 'Snippet',
            detail: 'Iterator Loop',
            documentation: 'Loop over iterator output.',
            insertText: 'for ${1:key}, ${2:value} in ${3:pairs(${4:tbl})} do\n\t${0}\nend',
            snippet: true
        },
        {
            label: 'while',
            kind: 'Snippet',
            detail: 'While Loop',
            documentation: 'Repeat while condition is true.',
            insertText: 'while ${1:condition} do\n\t${0}\nend',
            snippet: true
        },
        {
            label: 'repeat until',
            kind: 'Snippet',
            detail: 'Repeat Loop',
            documentation: 'Repeat until condition is true.',
            insertText: 'repeat\n\t${0}\nuntil ${1:condition}',
            snippet: true
        },
        {
            label: 'function',
            kind: 'Snippet',
            detail: 'Function',
            documentation: 'Declare a function.',
            insertText: 'function ${1:name}(${2:...})\n\t${0}\nend',
            snippet: true
        },
        {
            label: 'local function',
            kind: 'Snippet',
            detail: 'Local Function',
            documentation: 'Declare a local function.',
            insertText: 'local function ${1:name}(${2:...})\n\t${0}\nend',
            snippet: true
        },
        {
            label: 'pcall',
            kind: 'Snippet',
            detail: 'Protected Call',
            documentation: 'Execute function safely with pcall.',
            insertText: 'local ${1:ok}, ${2:result} = pcall(function()\n\t${0}\nend)',
            snippet: true
        }
    ];

    const ROBLOX_CONSTRUCTORS = [
        {
            label: 'Instance.new',
            kind: 'Constructor',
            detail: 'Roblox Constructor',
            documentation: 'Create a new Roblox instance.',
            insertText: 'Instance.new("${1:Part}")',
            snippet: true
        },
        {
            label: 'game:GetService',
            kind: 'Method',
            detail: 'ServiceProvider Method',
            documentation: 'Find or create a Roblox service.',
            insertText: 'game:GetService("${1:Players}")',
            snippet: true
        },
        {
            label: 'Vector3.new',
            kind: 'Constructor',
            detail: 'Datatype Constructor',
            documentation: 'Create a Vector3 value.',
            insertText: 'Vector3.new(${1:x}, ${2:y}, ${3:z})',
            snippet: true
        },
        {
            label: 'CFrame.new',
            kind: 'Constructor',
            detail: 'Datatype Constructor',
            documentation: 'Create a CFrame value.',
            insertText: 'CFrame.new(${0})',
            snippet: true
        },
        {
            label: 'CFrame.Angles',
            kind: 'Constructor',
            detail: 'Datatype Constructor',
            documentation: 'Construct rotation CFrame from radians.',
            insertText: 'CFrame.Angles(${1:rx}, ${2:ry}, ${3:rz})',
            snippet: true
        },
        {
            label: 'Color3.new',
            kind: 'Constructor',
            detail: 'Datatype Constructor',
            documentation: 'Create Color3 from 0..1 values.',
            insertText: 'Color3.new(${1:r}, ${2:g}, ${3:b})',
            snippet: true
        },
        {
            label: 'Color3.fromRGB',
            kind: 'Constructor',
            detail: 'Datatype Constructor',
            documentation: 'Create Color3 from 0..255 values.',
            insertText: 'Color3.fromRGB(${1:r}, ${2:g}, ${3:b})',
            snippet: true
        },
        {
            label: 'UDim2.new',
            kind: 'Constructor',
            detail: 'Datatype Constructor',
            documentation: 'Create UDim2 from scale and offset.',
            insertText: 'UDim2.new(${1:xScale}, ${2:xOffset}, ${3:yScale}, ${4:yOffset})',
            snippet: true
        },
        {
            label: 'UDim2.fromScale',
            kind: 'Constructor',
            detail: 'Datatype Constructor',
            documentation: 'Create UDim2 from scale components.',
            insertText: 'UDim2.fromScale(${1:x}, ${2:y})',
            snippet: true
        },
        {
            label: 'UDim2.fromOffset',
            kind: 'Constructor',
            detail: 'Datatype Constructor',
            documentation: 'Create UDim2 from offset components.',
            insertText: 'UDim2.fromOffset(${1:x}, ${2:y})',
            snippet: true
        },
        {
            label: 'RaycastParams.new',
            kind: 'Constructor',
            detail: 'Datatype Constructor',
            documentation: 'Create RaycastParams object.',
            insertText: 'RaycastParams.new()',
            snippet: true
        },
        {
            label: 'TweenInfo.new',
            kind: 'Constructor',
            detail: 'Datatype Constructor',
            documentation: 'Create TweenInfo object.',
            insertText: 'TweenInfo.new(${1:time}, Enum.EasingStyle.${2:Linear}, Enum.EasingDirection.${3:Out})',
            snippet: true
        }
    ];

    const INSTANCE_METHODS = [
        { label: 'FindFirstChild', kind: 'Method', detail: 'Instance Method', insertText: 'FindFirstChild(${1:name}, ${2:recursive})', snippet: true },
        { label: 'FindFirstChildOfClass', kind: 'Method', detail: 'Instance Method', insertText: 'FindFirstChildOfClass(${1:className})', snippet: true },
        { label: 'FindFirstChildWhichIsA', kind: 'Method', detail: 'Instance Method', insertText: 'FindFirstChildWhichIsA(${1:className}, ${2:recursive})', snippet: true },
        { label: 'FindFirstAncestor', kind: 'Method', detail: 'Instance Method', insertText: 'FindFirstAncestor(${1:name})', snippet: true },
        { label: 'FindFirstAncestorWhichIsA', kind: 'Method', detail: 'Instance Method', insertText: 'FindFirstAncestorWhichIsA(${1:className})', snippet: true },
        { label: 'WaitForChild', kind: 'Method', detail: 'Instance Method', insertText: 'WaitForChild(${1:name}, ${2:timeout})', snippet: true },
        { label: 'GetChildren', kind: 'Method', detail: 'Instance Method', insertText: 'GetChildren()', snippet: true },
        { label: 'GetDescendants', kind: 'Method', detail: 'Instance Method', insertText: 'GetDescendants()', snippet: true },
        { label: 'GetAttribute', kind: 'Method', detail: 'Instance Method', insertText: 'GetAttribute(${1:attributeName})', snippet: true },
        { label: 'SetAttribute', kind: 'Method', detail: 'Instance Method', insertText: 'SetAttribute(${1:attributeName}, ${2:value})', snippet: true },
        { label: 'GetAttributeChangedSignal', kind: 'Method', detail: 'Instance Method', insertText: 'GetAttributeChangedSignal(${1:attributeName})', snippet: true },
        { label: 'GetPropertyChangedSignal', kind: 'Method', detail: 'Instance Method', insertText: 'GetPropertyChangedSignal(${1:propertyName})', snippet: true },
        { label: 'IsA', kind: 'Method', detail: 'Instance Method', insertText: 'IsA(${1:className})', snippet: true },
        { label: 'IsDescendantOf', kind: 'Method', detail: 'Instance Method', insertText: 'IsDescendantOf(${1:ancestor})', snippet: true },
        { label: 'Clone', kind: 'Method', detail: 'Instance Method', insertText: 'Clone()', snippet: true },
        { label: 'Destroy', kind: 'Method', detail: 'Instance Method', insertText: 'Destroy()', snippet: true },
        { label: 'ClearAllChildren', kind: 'Method', detail: 'Instance Method', insertText: 'ClearAllChildren()', snippet: true },
        { label: 'GetFullName', kind: 'Method', detail: 'Instance Method', insertText: 'GetFullName()', snippet: true }
    ];

    const GAME_DOT_MEMBERS = [
        { label: 'Players', kind: 'Property', detail: 'Roblox Service', documentation: 'Players service.' },
        { label: 'Workspace', kind: 'Property', detail: 'Roblox Service', documentation: 'Workspace service.' },
        { label: 'ReplicatedStorage', kind: 'Property', detail: 'Roblox Service', documentation: 'ReplicatedStorage service.' },
        { label: 'ReplicatedFirst', kind: 'Property', detail: 'Roblox Service', documentation: 'ReplicatedFirst service.' },
        { label: 'Lighting', kind: 'Property', detail: 'Roblox Service', documentation: 'Lighting service.' },
        { label: 'StarterGui', kind: 'Property', detail: 'Roblox Service', documentation: 'StarterGui service.' },
        { label: 'StarterPlayer', kind: 'Property', detail: 'Roblox Service', documentation: 'StarterPlayer service.' },
        { label: 'ServerStorage', kind: 'Property', detail: 'Roblox Service', documentation: 'ServerStorage service.' },
        { label: 'ServerScriptService', kind: 'Property', detail: 'Roblox Service', documentation: 'ServerScriptService service.' },
        { label: 'SoundService', kind: 'Property', detail: 'Roblox Service', documentation: 'SoundService service.' },
        { label: 'RunService', kind: 'Property', detail: 'Roblox Service', documentation: 'RunService service.' },
        { label: 'GetService', kind: 'Method', detail: 'ServiceProvider Method', insertText: 'GetService(${1:className})', snippet: true },
        { label: 'FindService', kind: 'Method', detail: 'ServiceProvider Method', insertText: 'FindService(${1:className})', snippet: true }
    ];

    const WORKSPACE_MEMBERS = [
        { label: 'CurrentCamera', kind: 'Property', detail: 'Workspace Property', documentation: 'Active camera instance.' },
        { label: 'Gravity', kind: 'Property', detail: 'Workspace Property', documentation: 'Gravity value in studs/s^2.' },
        { label: 'Terrain', kind: 'Property', detail: 'Workspace Property', documentation: 'Terrain object.' },
        { label: 'Raycast', kind: 'Method', detail: 'Workspace Method', insertText: 'Raycast(${1:origin}, ${2:direction}, ${3:raycastParams})', snippet: true },
        { label: 'GetPartBoundsInBox', kind: 'Method', detail: 'Workspace Method', insertText: 'GetPartBoundsInBox(${1:cframe}, ${2:size}, ${3:overlapParams})', snippet: true },
        { label: 'GetPartBoundsInRadius', kind: 'Method', detail: 'Workspace Method', insertText: 'GetPartBoundsInRadius(${1:position}, ${2:radius}, ${3:overlapParams})', snippet: true },
        { label: 'FindPartOnRay', kind: 'Method', detail: 'Workspace Method', insertText: 'FindPartOnRay(${1:ray}, ${2:ignore})', snippet: true },
        { label: 'FindPartsInRegion3', kind: 'Method', detail: 'Workspace Method', insertText: 'FindPartsInRegion3(${1:region}, ${2:ignore}, ${3:maxParts})', snippet: true }
    ];

    const LIBRARY_MEMBERS = {
        task: [
            { label: 'spawn', kind: 'Function', detail: 'task API', insertText: 'spawn(${1:fn})', snippet: true },
            { label: 'defer', kind: 'Function', detail: 'task API', insertText: 'defer(${1:fn})', snippet: true },
            { label: 'delay', kind: 'Function', detail: 'task API', insertText: 'delay(${1:seconds}, ${2:fn})', snippet: true },
            { label: 'wait', kind: 'Function', detail: 'task API', insertText: 'wait(${1:seconds})', snippet: true },
            { label: 'cancel', kind: 'Function', detail: 'task API', insertText: 'cancel(${1:thread})', snippet: true },
            { label: 'synchronize', kind: 'Function', detail: 'task API', insertText: 'synchronize()', snippet: true },
            { label: 'desynchronize', kind: 'Function', detail: 'task API', insertText: 'desynchronize()', snippet: true }
        ],
        string: [
            { label: 'byte', kind: 'Function', detail: 'string API', insertText: 'byte(${1:text}, ${2:start}, ${3:finish})', snippet: true },
            { label: 'char', kind: 'Function', detail: 'string API', insertText: 'char(${0})', snippet: true },
            { label: 'find', kind: 'Function', detail: 'string API', insertText: 'find(${1:text}, ${2:pattern}, ${3:init}, ${4:plain})', snippet: true },
            { label: 'format', kind: 'Function', detail: 'string API', insertText: 'format(${0})', snippet: true },
            { label: 'gmatch', kind: 'Function', detail: 'string API', insertText: 'gmatch(${1:text}, ${2:pattern})', snippet: true },
            { label: 'gsub', kind: 'Function', detail: 'string API', insertText: 'gsub(${1:text}, ${2:pattern}, ${3:replacement})', snippet: true },
            { label: 'len', kind: 'Function', detail: 'string API', insertText: 'len(${1:text})', snippet: true },
            { label: 'lower', kind: 'Function', detail: 'string API', insertText: 'lower(${1:text})', snippet: true },
            { label: 'match', kind: 'Function', detail: 'string API', insertText: 'match(${1:text}, ${2:pattern}, ${3:init})', snippet: true },
            { label: 'split', kind: 'Function', detail: 'string API', insertText: 'split(${1:text}, ${2:separator})', snippet: true },
            { label: 'sub', kind: 'Function', detail: 'string API', insertText: 'sub(${1:text}, ${2:start}, ${3:finish})', snippet: true },
            { label: 'upper', kind: 'Function', detail: 'string API', insertText: 'upper(${1:text})', snippet: true }
        ],
        table: [
            { label: 'clear', kind: 'Function', detail: 'table API', insertText: 'clear(${1:tbl})', snippet: true },
            { label: 'clone', kind: 'Function', detail: 'table API', insertText: 'clone(${1:tbl})', snippet: true },
            { label: 'concat', kind: 'Function', detail: 'table API', insertText: 'concat(${1:list}, ${2:sep}, ${3:i}, ${4:j})', snippet: true },
            { label: 'find', kind: 'Function', detail: 'table API', insertText: 'find(${1:list}, ${2:value}, ${3:init})', snippet: true },
            { label: 'freeze', kind: 'Function', detail: 'table API', insertText: 'freeze(${1:tbl})', snippet: true },
            { label: 'insert', kind: 'Function', detail: 'table API', insertText: 'insert(${1:list}, ${2:value})', snippet: true },
            { label: 'move', kind: 'Function', detail: 'table API', insertText: 'move(${1:src}, ${2:start}, ${3:finish}, ${4:destStart}, ${5:dest})', snippet: true },
            { label: 'pack', kind: 'Function', detail: 'table API', insertText: 'pack(${0})', snippet: true },
            { label: 'remove', kind: 'Function', detail: 'table API', insertText: 'remove(${1:list}, ${2:index})', snippet: true },
            { label: 'sort', kind: 'Function', detail: 'table API', insertText: 'sort(${1:list}, ${2:comparator})', snippet: true },
            { label: 'unpack', kind: 'Function', detail: 'table API', insertText: 'unpack(${1:list}, ${2:start}, ${3:finish})', snippet: true }
        ],
        math: [
            { label: 'abs', kind: 'Function', detail: 'math API', insertText: 'abs(${1:x})', snippet: true },
            { label: 'clamp', kind: 'Function', detail: 'math API', insertText: 'clamp(${1:x}, ${2:min}, ${3:max})', snippet: true },
            { label: 'floor', kind: 'Function', detail: 'math API', insertText: 'floor(${1:x})', snippet: true },
            { label: 'ceil', kind: 'Function', detail: 'math API', insertText: 'ceil(${1:x})', snippet: true },
            { label: 'max', kind: 'Function', detail: 'math API', insertText: 'max(${0})', snippet: true },
            { label: 'min', kind: 'Function', detail: 'math API', insertText: 'min(${0})', snippet: true },
            { label: 'noise', kind: 'Function', detail: 'math API', insertText: 'noise(${1:x}, ${2:y}, ${3:z})', snippet: true },
            { label: 'random', kind: 'Function', detail: 'math API', insertText: 'random(${1:min}, ${2:max})', snippet: true },
            { label: 'round', kind: 'Function', detail: 'math API', insertText: 'round(${1:x})', snippet: true },
            { label: 'sqrt', kind: 'Function', detail: 'math API', insertText: 'sqrt(${1:x})', snippet: true },
            { label: 'pi', kind: 'Constant', detail: 'math constant', insertText: 'pi' },
            { label: 'huge', kind: 'Constant', detail: 'math constant', insertText: 'huge' }
        ],
        os: [
            { label: 'time', kind: 'Function', detail: 'os API', insertText: 'time(${1:dateTable})', snippet: true },
            { label: 'clock', kind: 'Function', detail: 'os API', insertText: 'clock()', snippet: true },
            { label: 'date', kind: 'Function', detail: 'os API', insertText: 'date(${1:format}, ${2:time})', snippet: true },
            { label: 'difftime', kind: 'Function', detail: 'os API', insertText: 'difftime(${1:time1}, ${2:time2})', snippet: true }
        ],
        coroutine: [
            { label: 'create', kind: 'Function', detail: 'coroutine API', insertText: 'create(${1:fn})', snippet: true },
            { label: 'resume', kind: 'Function', detail: 'coroutine API', insertText: 'resume(${1:thread}, ${2:...})', snippet: true },
            { label: 'running', kind: 'Function', detail: 'coroutine API', insertText: 'running()', snippet: true },
            { label: 'status', kind: 'Function', detail: 'coroutine API', insertText: 'status(${1:thread})', snippet: true },
            { label: 'wrap', kind: 'Function', detail: 'coroutine API', insertText: 'wrap(${1:fn})', snippet: true },
            { label: 'yield', kind: 'Function', detail: 'coroutine API', insertText: 'yield(${0})', snippet: true }
        ],
        debug: [
            { label: 'traceback', kind: 'Function', detail: 'debug API', insertText: 'traceback(${1:message}, ${2:level})', snippet: true },
            { label: 'profilebegin', kind: 'Function', detail: 'debug API', insertText: 'profilebegin(${1:name})', snippet: true },
            { label: 'profileend', kind: 'Function', detail: 'debug API', insertText: 'profileend()', snippet: true },
            { label: 'getinfo', kind: 'Function', detail: 'debug API', insertText: 'getinfo(${1:funcOrLevel}, ${2:"slnafu"})', snippet: true },
            { label: 'getconstants', kind: 'Function', detail: 'executor debug API', insertText: 'getconstants(${1:func})', snippet: true },
            { label: 'getupvalues', kind: 'Function', detail: 'executor debug API', insertText: 'getupvalues(${1:func})', snippet: true }
        ],
        bit32: [
            { label: 'band', kind: 'Function', detail: 'bit32 API', insertText: 'band(${0})', snippet: true },
            { label: 'bor', kind: 'Function', detail: 'bit32 API', insertText: 'bor(${0})', snippet: true },
            { label: 'bxor', kind: 'Function', detail: 'bit32 API', insertText: 'bxor(${0})', snippet: true },
            { label: 'bnot', kind: 'Function', detail: 'bit32 API', insertText: 'bnot(${1:x})', snippet: true },
            { label: 'lshift', kind: 'Function', detail: 'bit32 API', insertText: 'lshift(${1:x}, ${2:n})', snippet: true },
            { label: 'rshift', kind: 'Function', detail: 'bit32 API', insertText: 'rshift(${1:x}, ${2:n})', snippet: true }
        ]
    };

    const BASE_EXECUTOR_APIS = [
        { label: 'identifyexecutor', kind: 'Function', detail: 'Executor API', documentation: 'Return current executor name/version.', insertText: 'identifyexecutor()', snippet: true },
        { label: 'getgenv', kind: 'Function', detail: 'Executor API', documentation: 'Get executor global environment.', insertText: 'getgenv()', snippet: true },
        { label: 'getrenv', kind: 'Function', detail: 'Executor API', documentation: 'Get Roblox environment table.', insertText: 'getrenv()', snippet: true },
        { label: 'getsenv', kind: 'Function', detail: 'Executor API', documentation: 'Get environment for script instance.', insertText: 'getsenv(${1:script})', snippet: true },
        { label: 'getreg', kind: 'Function', detail: 'Executor API', documentation: 'Get Lua registry table.', insertText: 'getreg()', snippet: true },
        { label: 'getgc', kind: 'Function', detail: 'Executor API', documentation: 'Get garbage-collected objects.', insertText: 'getgc(${1:includeTables})', snippet: true },
        { label: 'getinstances', kind: 'Function', detail: 'Executor API', documentation: 'Get all instance objects.', insertText: 'getinstances()', snippet: true },
        { label: 'getnilinstances', kind: 'Function', detail: 'Executor API', documentation: 'Get nil-parented instances.', insertText: 'getnilinstances()', snippet: true },
        { label: 'getconnections', kind: 'Function', detail: 'Executor API', documentation: 'Get RBXScriptSignal connections.', insertText: 'getconnections(${1:signal})', snippet: true },
        { label: 'hookfunction', kind: 'Function', detail: 'Executor API', documentation: 'Hook a function and return original.', insertText: 'hookfunction(${1:target}, ${2:replacement})', snippet: true },
        { label: 'hookmetamethod', kind: 'Function', detail: 'Executor API', documentation: 'Hook a metamethod on object.', insertText: 'hookmetamethod(${1:object}, ${2:metamethod}, ${3:handler})', snippet: true },
        { label: 'newcclosure', kind: 'Function', detail: 'Executor API', documentation: 'Wrap Luau closure as C closure.', insertText: 'newcclosure(${1:func})', snippet: true },
        { label: 'checkcaller', kind: 'Function', detail: 'Executor API', documentation: 'Return true when call originates from executor thread.', insertText: 'checkcaller()', snippet: true },
        { label: 'readfile', kind: 'Function', detail: 'Executor Filesystem', documentation: 'Read workspace file contents.', insertText: 'readfile(${1:path})', snippet: true },
        { label: 'writefile', kind: 'Function', detail: 'Executor Filesystem', documentation: 'Write workspace file contents.', insertText: 'writefile(${1:path}, ${2:contents})', snippet: true },
        { label: 'appendfile', kind: 'Function', detail: 'Executor Filesystem', documentation: 'Append to workspace file.', insertText: 'appendfile(${1:path}, ${2:contents})', snippet: true },
        { label: 'isfile', kind: 'Function', detail: 'Executor Filesystem', documentation: 'Check if path is a file.', insertText: 'isfile(${1:path})', snippet: true },
        { label: 'listfiles', kind: 'Function', detail: 'Executor Filesystem', documentation: 'List files in folder path.', insertText: 'listfiles(${1:path})', snippet: true },
        { label: 'makefolder', kind: 'Function', detail: 'Executor Filesystem', documentation: 'Create workspace folder.', insertText: 'makefolder(${1:path})', snippet: true },
        { label: 'delfile', kind: 'Function', detail: 'Executor Filesystem', documentation: 'Delete workspace file.', insertText: 'delfile(${1:path})', snippet: true },
        { label: 'setclipboard', kind: 'Function', detail: 'Executor Utility', documentation: 'Set operating-system clipboard text.', insertText: 'setclipboard(${1:text})', snippet: true },
        { label: 'request', kind: 'Function', detail: 'Executor HTTP', documentation: 'Send HTTP request with config table.', insertText: 'request({\n\tUrl = ${1:"https://"},\n\tMethod = ${2:"GET"}\n})', snippet: true },
        { label: 'Drawing.new', kind: 'Function', detail: 'Drawing API', documentation: 'Create drawing primitive.', insertText: 'Drawing.new("${1|Line,Text,Image,Circle,Square,Quad,Triangle|}")', snippet: true }
    ];

    const EXTRA_EXECUTOR_APIS = [
        { label: 'base64decode', kind: 'Function', detail: 'Executor Crypto API', documentation: 'Decode Base64 string.', insertText: 'base64decode(${1:str})', snippet: true, filterText: 'base64decode+crypt.base64decode+base64_decode+crypt.base64.decode' },
        { label: 'base64encode', kind: 'Function', detail: 'Executor Crypto API', documentation: 'Encode string as Base64.', insertText: 'base64encode(${1:str})', snippet: true, filterText: 'base64encode+crypt.base64encode+base64_encode+crypt.base64.encode' },
        { label: 'getfpscap', kind: 'Function', detail: 'Executor API', documentation: 'Get current FPS cap.', insertText: 'getfpscap()', snippet: true },
        { label: 'setfpscap', kind: 'Function', detail: 'Executor API', documentation: 'Set FPS cap.', insertText: 'setfpscap(${1:fps})', snippet: true },
        { label: 'gettenv', kind: 'Function', detail: 'Executor API', documentation: 'Get thread environment table.', insertText: 'gettenv(${1:thread})', snippet: true },
        { label: 'filtergc', kind: 'Function', detail: 'Executor API', documentation: 'Filter GC objects by type and options.', insertText: 'filtergc(${1:filterType}, ${2:options}, ${3:returnOne})', snippet: true },
        { label: 'getscripts', kind: 'Function', detail: 'Executor API', documentation: 'Get Script, LocalScript, and ModuleScript instances.', insertText: 'getscripts()', snippet: true },
        { label: 'getrunningscripts', kind: 'Function', detail: 'Executor API', documentation: 'Get scripts currently running.', insertText: 'getrunningscripts()', snippet: true },
        { label: 'getloadedmodules', kind: 'Function', detail: 'Executor API', documentation: 'Get loaded ModuleScripts.', insertText: 'getloadedmodules()', snippet: true },
        { label: 'replicatesignal', kind: 'Function', detail: 'Executor API', documentation: 'Replicate supported signal to server.', insertText: 'replicatesignal(${1:signal}, ${2:...})', snippet: true },
        { label: 'cansignalreplicate', kind: 'Function', detail: 'Executor API', documentation: 'Check if signal can replicate.', insertText: 'cansignalreplicate(${1:signal})', snippet: true },
        { label: 'run_on_thread', kind: 'Function', detail: 'Executor API', documentation: 'Run script on specific thread.', insertText: 'run_on_thread(${1:thread}, ${2:script})', snippet: true },
        { label: 'queue_on_teleport', kind: 'Function', detail: 'Executor API', documentation: 'Queue script for next teleport.', insertText: 'queue_on_teleport(${1:source})', snippet: true },
        { label: 'clear_teleport_queue', kind: 'Function', detail: 'Executor API', documentation: 'Clear queued teleport script.', insertText: 'clear_teleport_queue()', snippet: true },
        { label: 'firesignal', kind: 'Function', detail: 'Executor API', documentation: 'Fire RBXScriptSignal connections.', insertText: 'firesignal(${1:signal}, ${2:...})', snippet: true },
        { label: 'fireclickdetector', kind: 'Function', detail: 'Executor API', documentation: 'Trigger ClickDetector events.', insertText: 'fireclickdetector(${1:detector}, ${2:distance}, ${3:event})', snippet: true },
        { label: 'fireproximityprompt', kind: 'Function', detail: 'Executor API', documentation: 'Trigger ProximityPrompt instantly.', insertText: 'fireproximityprompt(${1:prompt})', snippet: true },
        { label: 'firetouchinterest', kind: 'Function', detail: 'Executor API', documentation: 'Simulate touch begin/end events.', insertText: 'firetouchinterest(${1:partA}, ${2:partB}, ${3:state})', snippet: true },
        { label: 'isnetworkowner', kind: 'Function', detail: 'Executor API', documentation: 'Check part network ownership.', insertText: 'isnetworkowner(${1:basePart})', snippet: true },
        { label: 'gethiddenproperty', kind: 'Function', detail: 'Executor Reflection', documentation: 'Read hidden/non-scriptable property value.', insertText: 'gethiddenproperty(${1:instance}, ${2:property})', snippet: true },
        { label: 'sethiddenproperty', kind: 'Function', detail: 'Executor Reflection', documentation: 'Write hidden/non-scriptable property value.', insertText: 'sethiddenproperty(${1:instance}, ${2:property}, ${3:value})', snippet: true },
        { label: 'isscriptable', kind: 'Function', detail: 'Executor Reflection', documentation: 'Check if property is scriptable.', insertText: 'isscriptable(${1:instance}, ${2:property})', snippet: true },
        { label: 'setscriptable', kind: 'Function', detail: 'Executor Reflection', documentation: 'Toggle property scriptability.', insertText: 'setscriptable(${1:instance}, ${2:property}, ${3:state})', snippet: true },
        { label: 'setsimulationradius', kind: 'Function', detail: 'Executor API', documentation: 'Set player simulation radius.', insertText: 'setsimulationradius(${1:radius}, ${2:maxRadius})', snippet: true },

        { label: 'getthreadidentity', kind: 'Function', detail: 'Executor API', documentation: 'Get current thread identity.', insertText: 'getthreadidentity()', snippet: true },
        { label: 'setthreadidentity', kind: 'Function', detail: 'Executor API', documentation: 'Set current thread identity.', insertText: 'setthreadidentity(${1:identity})', snippet: true },
        { label: 'getscriptfromthread', kind: 'Function', detail: 'Executor API', documentation: 'Get script instance associated with thread.', insertText: 'getscriptfromthread(${1:thread})', snippet: true },
        { label: 'gethui', kind: 'Function', detail: 'Executor API', documentation: 'Get hidden UI container.', insertText: 'gethui()', snippet: true },
        { label: 'cloneref', kind: 'Function', detail: 'Executor API', documentation: 'Clone instance reference.', insertText: 'cloneref(${1:instance})', snippet: true },
        { label: 'comparefunction', kind: 'Function', detail: 'Executor API', documentation: 'Compare two function objects.', insertText: 'comparefunction(${1:a}, ${2:b})', snippet: true },
        { label: 'compareinstances', kind: 'Function', detail: 'Executor API', documentation: 'Compare two instance objects.', insertText: 'compareinstances(${1:a}, ${2:b})', snippet: true },
        { label: 'ishiddenproperty', kind: 'Function', detail: 'Executor Reflection', documentation: 'Check if property is hidden.', insertText: 'ishiddenproperty(${1:instance}, ${2:property})', snippet: true },
        { label: 'getproperties', kind: 'Function', detail: 'Executor Reflection', documentation: 'Get instance property names.', insertText: 'getproperties(${1:instance})', snippet: true },
        { label: 'gethiddenproperties', kind: 'Function', detail: 'Executor Reflection', documentation: 'Get hidden property names.', insertText: 'gethiddenproperties(${1:instance})', snippet: true },
        { label: 'getscriptbytecode', kind: 'Function', detail: 'Executor API', documentation: 'Get script bytecode.', insertText: 'getscriptbytecode(${1:script})', snippet: true },
        { label: 'disassemblefunction', kind: 'Function', detail: 'Executor API', documentation: 'Disassembles a function.', insertText: 'disassemblefunction(${1:function})', snippet: true },

        { label: 'getactors', kind: 'Function', detail: 'Executor Actor API', documentation: 'Get all Actor instances.', insertText: 'getactors()', snippet: true },
        { label: 'run_on_actor', kind: 'Function', detail: 'Executor Actor API', documentation: 'Run source on Actor.', insertText: 'run_on_actor(${1:actor}, ${2:script}, ${3:...})', snippet: true },
        { label: 'create_comm_channel', kind: 'Function', detail: 'Executor Actor API', documentation: 'Create actor communication channel.', insertText: 'create_comm_channel()', snippet: true },
        { label: 'get_comm_channel', kind: 'Function', detail: 'Executor Actor API', documentation: 'Get actor communication channel by id.', insertText: 'get_comm_channel(${1:id})', snippet: true },
        { label: 'isparallel', kind: 'Function', detail: 'Executor Actor API', documentation: 'Check if current thread is parallel.', insertText: 'isparallel()', snippet: true },
        { label: 'getactorthreads', kind: 'Function', detail: 'Executor Actor API', documentation: 'Get threads associated with actors.', insertText: 'getactorthreads()', snippet: true },
        { label: 'getactorthread', kind: 'Function', detail: 'Executor Actor API', documentation: 'Get actor thread for specific actor.', insertText: 'getactorthread(${1:actor})', snippet: true },

        { label: 'HttpGet', kind: 'Function', detail: 'Roblox/Executor API', documentation: 'HTTP GET request helper.', insertText: 'game:HttpGet(${1:url})', snippet: true, filterText: 'HttpGet+game:HttpGet' },
        { label: 'gethwid', kind: 'Function', detail: 'Executor API', documentation: 'Return hashed hardware id.', insertText: 'gethwid()', snippet: true },
        { label: 'getallthreads', kind: 'Function', detail: 'Executor API', documentation: 'Get all Lua threads.', insertText: 'getallthreads()', snippet: true },
        { label: 'getcallingscript', kind: 'Function', detail: 'Executor API', documentation: 'Get script calling current closure.', insertText: 'getcallingscript()', snippet: true },
        { label: 'getcallbackvalue', kind: 'Function', detail: 'Executor API', documentation: 'Get callback member function.', insertText: 'getcallbackvalue(${1:instance}, ${2:property})', snippet: true },
        { label: 'setcallbackvalue', kind: 'Function', detail: 'Executor API', documentation: 'Set callback member function.', insertText: 'setcallbackvalue(${1:instance}, ${2:property}, ${3:func})', snippet: true },
        { label: 'getscriptclosure', kind: 'Function', detail: 'Executor API', documentation: 'Create closure from script bytecode.', insertText: 'getscriptclosure(${1:script})', snippet: true },
        { label: 'getscripthash', kind: 'Function', detail: 'Executor API', documentation: 'SHA hash of script bytecode.', insertText: 'getscripthash(${1:script})', snippet: true },

        { label: 'getrawmetatable', kind: 'Function', detail: 'Executor Table API', documentation: 'Get raw metatable bypassing __metatable.', insertText: 'getrawmetatable(${1:object})', snippet: true },
        { label: 'setrawmetatable', kind: 'Function', detail: 'Executor Table API', documentation: 'Set raw metatable bypassing lock.', insertText: 'setrawmetatable(${1:object}, ${2:metatable})', snippet: true },
        { label: 'setreadonly', kind: 'Function', detail: 'Executor Table API', documentation: 'Toggle table readonly state.', insertText: 'setreadonly(${1:table}, ${2:state})', snippet: true },
        { label: 'isreadonly', kind: 'Function', detail: 'Executor Table API', documentation: 'Read table readonly state.', insertText: 'isreadonly(${1:table})', snippet: true },

        { label: 'iswindowactive', kind: 'Function', detail: 'Executor Input API', documentation: 'Check if Roblox window is focused.', insertText: 'iswindowactive()', snippet: true, filterText: 'iswindowactive+isrbxactive+isRobloxFocused' },
        { label: 'keypress', kind: 'Function', detail: 'Executor Input API', documentation: 'Simulate keyboard key press.', insertText: 'keypress(${1:keycode})', snippet: true },
        { label: 'keyrelease', kind: 'Function', detail: 'Executor Input API', documentation: 'Simulate keyboard key release.', insertText: 'keyrelease(${1:keycode})', snippet: true },
        { label: 'mouse1click', kind: 'Function', detail: 'Executor Input API', documentation: 'Simulate left mouse click.', insertText: 'mouse1click()', snippet: true },
        { label: 'mouse1press', kind: 'Function', detail: 'Executor Input API', documentation: 'Press left mouse button down.', insertText: 'mouse1press()', snippet: true },
        { label: 'mouse1release', kind: 'Function', detail: 'Executor Input API', documentation: 'Release left mouse button.', insertText: 'mouse1release()', snippet: true },
        { label: 'mouse2click', kind: 'Function', detail: 'Executor Input API', documentation: 'Simulate right mouse click.', insertText: 'mouse2click()', snippet: true },
        { label: 'mouse2press', kind: 'Function', detail: 'Executor Input API', documentation: 'Press right mouse button down.', insertText: 'mouse2press()', snippet: true },
        { label: 'mouse2release', kind: 'Function', detail: 'Executor Input API', documentation: 'Release right mouse button.', insertText: 'mouse2release()', snippet: true },
        { label: 'mousescroll', kind: 'Function', detail: 'Executor Input API', documentation: 'Scroll mouse wheel.', insertText: 'mousescroll(${1:delta})', snippet: true },
        { label: 'mousemoverel', kind: 'Function', detail: 'Executor Input API', documentation: 'Move mouse relatively.', insertText: 'mousemoverel(${1:x}, ${2:y})', snippet: true },
        { label: 'mousemoveabs', kind: 'Function', detail: 'Executor Input API', documentation: 'Move mouse to absolute coordinates.', insertText: 'mousemoveabs(${1:x}, ${2:y})', snippet: true },

        { label: 'isfunctionhooked', kind: 'Function', detail: 'Executor Hook API', documentation: 'Check if function is hooked.', insertText: 'isfunctionhooked(${1:func})', snippet: true },
        { label: 'restorefunction', kind: 'Function', detail: 'Executor Hook API', documentation: 'Restore original hooked function.', insertText: 'restorefunction(${1:func})', snippet: true },
        { label: 'clonefunction', kind: 'Function', detail: 'Executor Hook API', documentation: 'Clone function behavior.', insertText: 'clonefunction(${1:func})', snippet: true },
        { label: 'getfunctionhash', kind: 'Function', detail: 'Executor Hook API', documentation: 'Get hash of function bytecode and constants.', insertText: 'getfunctionhash(${1:func})', snippet: true },
        { label: 'isexecutorclosure', kind: 'Function', detail: 'Executor Hook API', documentation: 'Check if closure belongs to executor.', insertText: 'isexecutorclosure(${1:func})', snippet: true },
        { label: 'isnewcclosure', kind: 'Function', detail: 'Executor Hook API', documentation: 'Check if function is newcclosure.', insertText: 'isnewcclosure(${1:func})', snippet: true },
        { label: 'iscclosure', kind: 'Function', detail: 'Executor Hook API', documentation: 'Check if function is C closure.', insertText: 'iscclosure(${1:func})', snippet: true },
        { label: 'islclosure', kind: 'Function', detail: 'Executor Reflection', documentation: 'Check if function is Luau closure.', insertText: 'islclosure(${1:func})', snippet: true },
        { label: 'decompile', kind: 'Function', detail: 'Executor Reflection', documentation: 'Decompile script source.', insertText: 'decompile(${1:script})', snippet: true },

        { label: 'getcustomasset', kind: 'Function', detail: 'Executor Filesystem', documentation: 'Generate content id from local asset path.', insertText: 'getcustomasset(${1:path})', snippet: true },
        { label: 'loadfile', kind: 'Function', detail: 'Executor Filesystem', documentation: 'Load local file as chunk.', insertText: 'loadfile(${1:path})', snippet: true },
        { label: 'delfolder', kind: 'Function', detail: 'Executor Filesystem', documentation: 'Delete folder at path.', insertText: 'delfolder(${1:path})', snippet: true },
        { label: 'dofile', kind: 'Function', detail: 'Executor Filesystem', documentation: 'Load and execute local file.', insertText: 'dofile(${1:path})', snippet: true, filterText: 'dofile+runfile' },

        { label: 'setfflag', kind: 'Function', detail: 'Executor Utility', documentation: 'Set fast-flag value before game start.', insertText: 'setfflag(${1:fflag}, ${2:value})', snippet: true },
        { label: 'getnamecallmethod', kind: 'Function', detail: 'Executor Utility', documentation: 'Read current __namecall method in hook.', insertText: 'getnamecallmethod()', snippet: true },
        { label: 'setnamecallmethod', kind: 'Function', detail: 'Executor Utility', documentation: 'Set __namecall method in hook.', insertText: 'setnamecallmethod(${1:name})', snippet: true },
        { label: 'getspecialinfo', kind: 'Function', detail: 'Executor Utility', documentation: 'Get special instance data (mesh/union/etc).', insertText: 'getspecialinfo(${1:instance})', snippet: true },
        { label: 'saveinstance', kind: 'Function', detail: 'Executor Utility', documentation: 'Save current place to file.', insertText: 'saveinstance(${1:options})', snippet: true },

        { label: 'cleardrawcache', kind: 'Function', detail: 'Drawing API', documentation: 'Clear all active drawing objects.', insertText: 'cleardrawcache()', snippet: true },
        { label: 'getrenderproperty', kind: 'Function', detail: 'Drawing API', documentation: 'Get drawing object property value.', insertText: 'getrenderproperty(${1:drawing}, ${2:property})', snippet: true },
        { label: 'setrenderproperty', kind: 'Function', detail: 'Drawing API', documentation: 'Set drawing object property value.', insertText: 'setrenderproperty(${1:drawing}, ${2:property}, ${3:value})', snippet: true },
        { label: 'isrenderobj', kind: 'Function', detail: 'Drawing API', documentation: 'Check if value is drawing object.', insertText: 'isrenderobj(${1:value})', snippet: true },
        { label: 'Drawing.line', kind: 'Snippet', detail: 'Drawing API Snippet', documentation: 'Create and configure drawing line.', insertText: 'local ${1:line} = Drawing.new("Line")\n${1:line}.From = Vector2.new(${2:0}, ${3:0})\n${1:line}.To = Vector2.new(${4:100}, ${5:100})\n${1:line}.Thickness = ${6:1}\n${1:line}.Color = Color3.new(${7:1}, ${8:1}, ${9:1})', snippet: true },
        { label: 'Drawing.text', kind: 'Snippet', detail: 'Drawing API Snippet', documentation: 'Create and configure drawing text.', insertText: 'local ${1:text} = Drawing.new("Text")\n${1:text}.Text = "${2:hello}"\n${1:text}.Position = Vector2.new(${3:0}, ${4:0})\n${1:text}.Size = ${5:13}\n${1:text}.Color = Color3.new(${6:1}, ${7:1}, ${8:1})', snippet: true },
        { label: 'WebSocket.connect', kind: 'Function', detail: 'Executor WebSocket', documentation: 'Connect to websocket endpoint.', insertText: 'WebSocket.connect(${1:"ws://localhost:3000"})', snippet: true },

        { label: 'debug.getconstants', kind: 'Function', detail: 'Executor Debug API', documentation: 'Get function constants.', insertText: 'debug.getconstants(${1:func})', snippet: true, filterText: 'debug.getconstants+debug.getconsts+getconsts+getconstants' },
        { label: 'debug.getconstant', kind: 'Function', detail: 'Executor Debug API', documentation: 'Get function constant by index.', insertText: 'debug.getconstant(${1:func}, ${2:index})', snippet: true, filterText: 'debug.getconstant+debug.getconst+getconst+getconstant' },
        { label: 'debug.setconstant', kind: 'Function', detail: 'Executor Debug API', documentation: 'Set function constant by index.', insertText: 'debug.setconstant(${1:func}, ${2:index}, ${3:value})', snippet: true, filterText: 'debug.setconstant+debug.setconst+setconstant+setconst' },
        { label: 'debug.getupvalues', kind: 'Function', detail: 'Executor Debug API', documentation: 'Get function upvalues.', insertText: 'debug.getupvalues(${1:func})', snippet: true, filterText: 'debug.getupvalues+debug.getupvals+getupvalues+getupvals' },
        { label: 'debug.getupvalue', kind: 'Function', detail: 'Executor Debug API', documentation: 'Get function upvalue by index.', insertText: 'debug.getupvalue(${1:func}, ${2:index})', snippet: true, filterText: 'debug.getupvalue+debug.getupval+getupvalue+getupval' },
        { label: 'debug.setupvalue', kind: 'Function', detail: 'Executor Debug API', documentation: 'Set function upvalue by index.', insertText: 'debug.setupvalue(${1:func}, ${2:index}, ${3:value})', snippet: true, filterText: 'debug.setupvalue+debug.setupval+setupvalue+setupval' },
        { label: 'debug.getprotos', kind: 'Function', detail: 'Executor Debug API', documentation: 'Get nested function protos.', insertText: 'debug.getprotos(${1:func})', snippet: true },
        { label: 'debug.getproto', kind: 'Function', detail: 'Executor Debug API', documentation: 'Get proto by index.', insertText: 'debug.getproto(${1:func}, ${2:index}, ${3:active})', snippet: true },
        { label: 'debug.setproto', kind: 'Function', detail: 'Executor Debug API', documentation: 'Replace proto at index.', insertText: 'debug.setproto(${1:func}, ${2:index}, ${3:replacement})', snippet: true },
        { label: 'debug.getstack', kind: 'Function', detail: 'Executor Debug API', documentation: 'Get stack values at frame.', insertText: 'debug.getstack(${1:funcOrLevel})', snippet: true },
        { label: 'debug.isvalidlevel', kind: 'Function', detail: 'Executor Debug API', documentation: 'Check if stack level exists.', insertText: 'debug.isvalidlevel(${1:level})', snippet: true },
        { label: 'debug.setstack', kind: 'Function', detail: 'Executor Debug API', documentation: 'Set stack value at frame and index.', insertText: 'debug.setstack(${1:funcOrLevel}, ${2:index}, ${3:value})', snippet: true },
        { label: 'debug.getregistry', kind: 'Function', detail: 'Executor Debug API', documentation: 'Get Luau registry table.', insertText: 'debug.getregistry()', snippet: true }
    ];

    const EXECUTOR_APIS = mergeUniqueEntries(BASE_EXECUTOR_APIS.concat(EXTRA_EXECUTOR_APIS));

    const state = {
        services: uniqueSorted(DEFAULT_SERVICES),
        instances: uniqueSorted(DEFAULT_INSTANCES),
        enums: uniqueSorted(DEFAULT_ENUMS),
        enumMembers: {}
    };

    let robloxApiBootPromise = null;
    let luaProviderDisposable = null;

    function disposeLuaIntellisense() {
        if (luaProviderDisposable && typeof luaProviderDisposable.dispose === 'function') {
            luaProviderDisposable.dispose();
        }
        luaProviderDisposable = null;
    }

    function uniqueSorted(values) {
        const seen = new Set();
        for (let i = 0; i < values.length; i += 1) {
            if (typeof values[i] !== 'string') {
                continue;
            }
            const value = values[i].trim();
            if (!value) {
                continue;
            }
            seen.add(value);
        }
        return Array.from(seen).sort((a, b) => a.localeCompare(b));
    }

    function mergeUniqueEntries(entries) {
        const byLabel = new Map();
        for (let i = 0; i < entries.length; i += 1) {
            const entry = entries[i];
            if (!entry || typeof entry.label !== 'string' || !entry.label.trim()) {
                continue;
            }
            byLabel.set(entry.label, entry);
        }
        return Array.from(byLabel.values());
    }

    function getCompletionKind(monaco, kindName) {
        const kinds = monaco.languages.CompletionItemKind;
        return kinds[kindName] || kinds.Text;
    }

    function normalizeDocumentation(documentation) {
        if (!documentation) {
            return undefined;
        }
        if (typeof documentation === 'string') {
            return { value: documentation };
        }
        return documentation;
    }

    function getWordRange(model, position) {
        const word = model.getWordUntilPosition(position);
        return {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn
        };
    }

    function getLinePrefix(model, position) {
        return model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column
        });
    }

    function makeSuggestion(monaco, range, entry, sortGroup, index) {
        const suggestion = {
            label: entry.label,
            kind: getCompletionKind(monaco, entry.kind),
            detail: entry.detail,
            documentation: normalizeDocumentation(entry.documentation),
            sortText: `${sortGroup}${String(index).padStart(4, '0')}`,
            insertText: entry.insertText || entry.label,
            range
        };

        if (entry.filterText) {
            suggestion.filterText = entry.filterText;
        }

        if (entry.snippet) {
            suggestion.insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
        }

        return suggestion;
    }

    function makeSimpleSuggestions(monaco, range, labels, detail, kind, sortGroup) {
        return labels.map((label, index) => makeSuggestion(monaco, range, {
            label,
            kind,
            detail,
            insertText: label
        }, sortGroup, index));
    }

    function buildServiceCallSuggestions(monaco, range) {
        return state.services.map((serviceName, index) => makeSuggestion(monaco, range, {
            label: serviceName,
            kind: 'Class',
            detail: 'Roblox Service',
            documentation: `${serviceName} service.`,
            insertText: serviceName
        }, '00', index));
    }

    function buildInstanceCreationSuggestions(monaco, range) {
        return state.instances.map((className, index) => makeSuggestion(monaco, range, {
            label: className,
            kind: 'Class',
            detail: 'Creatable Roblox Class',
            documentation: `${className} can be created with Instance.new().`,
            insertText: className
        }, '00', index));
    }

    function buildEnumTypeSuggestions(monaco, range) {
        return state.enums.map((enumName, index) => makeSuggestion(monaco, range, {
            label: enumName,
            kind: 'Enum',
            detail: 'Roblox Enum',
            documentation: `Enum.${enumName}`,
            insertText: enumName
        }, '00', index));
    }

    function buildEnumMemberSuggestions(monaco, range, enumName) {
        const members = state.enumMembers[enumName.toLowerCase()] || [];
        if (!members.length) {
            return [];
        }
        return members.map((memberName, index) => makeSuggestion(monaco, range, {
            label: memberName,
            kind: 'EnumMember',
            detail: `Enum.${enumName} Member`,
            insertText: memberName
        }, '00', index));
    }

    function buildObjectMemberSuggestions(monaco, range, objectName, separator) {
        const objectKey = objectName.toLowerCase();

        if (objectKey === 'enum' && separator === '.') {
            return buildEnumTypeSuggestions(monaco, range);
        }

        if (LIBRARY_MEMBERS[objectKey] && separator === '.') {
            return LIBRARY_MEMBERS[objectKey].map((entry, index) => makeSuggestion(monaco, range, entry, '00', index));
        }

        if (objectKey === 'game' && separator === '.') {
            return GAME_DOT_MEMBERS.map((entry, index) => makeSuggestion(monaco, range, entry, '00', index));
        }

        if (objectKey === 'workspace' && separator === '.') {
            return WORKSPACE_MEMBERS.map((entry, index) => makeSuggestion(monaco, range, entry, '00', index));
        }

        if (objectKey === 'instance' && separator === '.') {
            return [makeSuggestion(monaco, range, {
                label: 'new',
                kind: 'Method',
                detail: 'Instance Constructor',
                documentation: 'Create Roblox instance by class name.',
                insertText: 'new("${1:Part}")',
                snippet: true
            }, '00', 0)];
        }

        if (separator === ':') {
            const contextualMethods = [];

            if (objectKey === 'game') {
                contextualMethods.push(
                    {
                        label: 'GetService',
                        kind: 'Method',
                        detail: 'ServiceProvider Method',
                        insertText: 'GetService("${1:Players}")',
                        documentation: 'Return service by class name, creating it if needed.',
                        snippet: true
                    },
                    {
                        label: 'FindService',
                        kind: 'Method',
                        detail: 'ServiceProvider Method',
                        insertText: 'FindService("${1:Players}")',
                        documentation: 'Return service by class name only if existing.',
                        snippet: true
                    }
                );
            }

            if (objectKey === 'workspace') {
                contextualMethods.push(
                    {
                        label: 'Raycast',
                        kind: 'Method',
                        detail: 'Workspace Method',
                        insertText: 'Raycast(${1:origin}, ${2:direction}, ${3:raycastParams})',
                        snippet: true
                    }
                );
            }

            const allMethods = contextualMethods.concat(INSTANCE_METHODS);
            return allMethods.map((entry, index) => makeSuggestion(monaco, range, entry, '00', index));
        }

        return [];
    }

    function buildGeneralSuggestions(monaco, range) {
        const suggestions = [];

        LUA_SNIPPETS.forEach((entry, index) => {
            suggestions.push(makeSuggestion(monaco, range, entry, '10', index));
        });

        LUA_GLOBALS.forEach((entry, index) => {
            suggestions.push(makeSuggestion(monaco, range, entry, '20', index));
        });

        ROBLOX_CONSTRUCTORS.forEach((entry, index) => {
            suggestions.push(makeSuggestion(monaco, range, entry, '30', index));
        });

        state.services.forEach((serviceName, index) => {
            suggestions.push(makeSuggestion(monaco, range, {
                label: serviceName,
                kind: 'Module',
                detail: 'Roblox Service',
                documentation: `${serviceName} service.`,
                insertText: serviceName
            }, '40', index));
        });

        LUA_KEYWORDS.forEach((keyword, index) => {
            suggestions.push(makeSuggestion(monaco, range, {
                label: keyword,
                kind: 'Keyword',
                detail: 'Lua Keyword',
                insertText: keyword
            }, '50', index));
        });

        EXECUTOR_APIS.forEach((entry, index) => {
            suggestions.push(makeSuggestion(monaco, range, entry, '60', index));
        });

        return suggestions;
    }

    function parseRobloxDump(json) {
        const classes = Array.isArray(json && json.Classes) ? json.Classes : [];
        const enums = Array.isArray(json && json.Enums) ? json.Enums : [];

        const services = [];
        const instances = [];

        for (let index = 0; index < classes.length; index += 1) {
            const element = classes[index];
            if (!element || typeof element.Name !== 'string') {
                continue;
            }

            const tags = Array.isArray(element.Tags) ? element.Tags : [];
            if (tags.includes('Service')) {
                services.push(element.Name);
                continue;
            }

            if (!tags.includes('NotCreatable')) {
                instances.push(element.Name);
            }
        }

        const enumNames = [];
        const enumMembers = {};

        for (let index = 0; index < enums.length; index += 1) {
            const enumData = enums[index];
            if (!enumData || typeof enumData.Name !== 'string') {
                continue;
            }

            enumNames.push(enumData.Name);

            const items = Array.isArray(enumData.Items) ? enumData.Items : [];
            const members = [];
            for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
                const item = items[itemIndex];
                if (!item || typeof item.Name !== 'string') {
                    continue;
                }
                members.push(item.Name);
            }

            if (members.length) {
                enumMembers[enumData.Name.toLowerCase()] = uniqueSorted(members);
            }
        }

        return {
            services: uniqueSorted(services),
            instances: uniqueSorted(instances),
            enums: uniqueSorted(enumNames),
            enumMembers
        };
    }

    async function warmRobloxApiData() {
        if (robloxApiBootPromise) {
            return robloxApiBootPromise;
        }

        robloxApiBootPromise = (async () => {
            try {
                const response = await fetch(API_DUMP_URL, { cache: 'no-store' });
                if (!response.ok) {
                    throw new Error(`API dump fetch failed: ${response.status}`);
                }

                const dump = await response.json();
                const parsed = parseRobloxDump(dump);

                if (parsed.services.length) {
                    state.services = parsed.services;
                }
                if (parsed.instances.length) {
                    state.instances = parsed.instances;
                }
                if (parsed.enums.length) {
                    state.enums = parsed.enums;
                }
                if (Object.keys(parsed.enumMembers).length) {
                    state.enumMembers = parsed.enumMembers;
                }
            } catch (error) {
                console.warn('[OpiumIntelliSense] Unable to load Roblox API dump, using fallback lists.', error);
            }
        })();

        return robloxApiBootPromise;
    }

    function registerLuaIntellisense(monaco) {
        if (!monaco || !monaco.languages) {
            return null;
        }

        disposeLuaIntellisense();

        void warmRobloxApiData();

        luaProviderDisposable = monaco.languages.registerCompletionItemProvider('lua', {
            triggerCharacters: ['.', ':', '"', "'", '('],
            provideCompletionItems: function (model, position) {
                const range = getWordRange(model, position);
                const linePrefix = getLinePrefix(model, position);

                if (/(?:game\s*:\s*(?:GetService|FindService)\s*\(\s*["'][^"']*)$/i.test(linePrefix)) {
                    return { suggestions: buildServiceCallSuggestions(monaco, range) };
                }

                if (/(?:instance\s*\.\s*new\s*\(\s*["'][^"']*)$/i.test(linePrefix)) {
                    return { suggestions: buildInstanceCreationSuggestions(monaco, range) };
                }

                const enumMemberMatch = /Enum\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)?$/i.exec(linePrefix);
                if (enumMemberMatch) {
                    const enumMemberSuggestions = buildEnumMemberSuggestions(monaco, range, enumMemberMatch[1]);
                    if (enumMemberSuggestions.length) {
                        return { suggestions: enumMemberSuggestions };
                    }
                }

                const memberMatch = /([A-Za-z_][A-Za-z0-9_]*)\s*([.:])\s*([A-Za-z_][A-Za-z0-9_]*)?$/.exec(linePrefix);
                if (memberMatch) {
                    const memberSuggestions = buildObjectMemberSuggestions(monaco, range, memberMatch[1], memberMatch[2]);
                    if (memberSuggestions.length) {
                        return { suggestions: memberSuggestions };
                    }
                }

                return { suggestions: buildGeneralSuggestions(monaco, range) };
            }
        });

        return luaProviderDisposable;
    }

    function setEnabled(monaco, editor, enabled) {
        const shouldEnable = enabled !== false;

        if (!shouldEnable) {
            disposeLuaIntellisense();
            if (editor && typeof editor.updateOptions === 'function') {
                editor.updateOptions({
                    quickSuggestions: { other: false, comments: false, strings: false },
                    suggestOnTriggerCharacters: false,
                    parameterHints: { enabled: false }
                });
            }
            return false;
        }

        if (monaco && monaco.languages) {
            registerLuaIntellisense(monaco);
        }

        if (editor && typeof editor.updateOptions === 'function') {
            editor.updateOptions({
                quickSuggestions: { other: true, comments: false, strings: false },
                suggestOnTriggerCharacters: true,
                parameterHints: { enabled: true }
            });
            styleSuggestionWidget(editor);
        }

        return true;
    }

    function styleSuggestionWidget(editor) {
        if (!editor || typeof editor.updateOptions !== 'function') {
            return;
        }

        editor.updateOptions({
            suggestSelection: 'recentlyUsedByPrefix',
            suggestFontSize: 13,
            suggestLineHeight: 24,
            acceptSuggestionOnCommitCharacter: false,
            inlineSuggest: { enabled: false },
            suggest: {
                showMethods: true,
                showFunctions: true,
                showConstructors: true,
                showFields: true,
                showVariables: true,
                showClasses: true,
                showStructs: true,
                showInterfaces: true,
                showModules: true,
                showProperties: true,
                showEvents: true,
                showOperators: true,
                showUnits: true,
                showValues: true,
                showConstants: true,
                showEnums: true,
                showEnumMembers: true,
                showKeywords: true,
                showWords: false,
                showColors: true,
                showFiles: true,
                showReferences: true,
                showCustomcolors: true,
                showFolders: true,
                showTypeParameters: true,
                showSnippets: true,
                showUsers: true,
                showIssues: true,
                showStatusBar: true,
                snippetsPreventQuickSuggestions: false,
                localityBonus: true,
                insertMode: 'replace',
                preview: false,
                previewMode: 'subwordSmart',
                selectionMode: 'always',
                shareSuggestSelections: true,
                filterGraceful: true,
                maxVisibleSuggestions: 14
            }
        });
    }

    window.OpiumIntelliSense = {
        registerLuaIntellisense,
        setEnabled,
        styleSuggestionWidget,
        warmRobloxApiData,
        disposeLuaIntellisense
    };
})();
