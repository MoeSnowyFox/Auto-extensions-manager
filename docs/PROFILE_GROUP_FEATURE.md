# 配置组功能设计文档

## 功能概述

实现一个**配置组**功能，允许用户根据网页 URL 自动切换扩展的启用/禁用状态。

### 核心功能

1. **URL 匹配模式**：支持域名通配、网址通配、正则表达式三种匹配方式
2. **配置组管理**：用户可以创建多个配置组，每个配置组包含：
   - 一组 URL 匹配规则
   - 一组扩展的目标状态（启用/禁用/保持原状）
3. **自动切换**：当访问的网页 URL 匹配某个配置组的规则时，自动切换扩展状态

## 技术设计

### 1. URL 匹配模式

参考 SwitchyOmega 的匹配规则设计：

#### 1.1 域名通配 (Host Wildcard)

- `*.example.com` - 匹配 `example.com` 及其所有子域名
- `.example.com` - 等同于 `*.example.com`
- `**.example.com` - 只匹配子域名，不匹配主域名
- `example.*` - 匹配所有 TLD

#### 1.2 网址通配 (URL Wildcard)

- `*://example.com/*` - 匹配任意协议和路径
- `https://example.com/path/*` - 匹配特定路径前缀
- `*` 匹配任意字符序列

#### 1.3 正则表达式 (Regex)

- 完整的 JavaScript 正则表达式支持
- 例：`^https://.*\.example\.com/.*$`

### 2. 数据结构设计

```typescript
// 匹配条件类型
type MatchType = 'host-wildcard' | 'url-wildcard' | 'regex';

// URL 匹配条件
interface MatchCondition {
	id: string; // 唯一标识符
	type: MatchType; // 匹配类型
	pattern: string; // 匹配模式
	enabled: boolean; // 条件是否启用
}

// 扩展状态
type ExtensionTargetState = 'enable' | 'disable' | 'keep';

// 扩展状态配置
interface ExtensionStateConfig {
	extensionId: string; // 扩展 ID
	targetState: ExtensionTargetState; // 目标状态
}

// 配置组
interface ProfileGroup {
	id: string; // 唯一标识符
	name: string; // 配置组名称
	enabled: boolean; // 配置组是否启用
	priority: number; // 优先级（数字越大优先级越高）
	conditions: MatchCondition[]; // URL 匹配条件（OR 关系）
	extensionStates: ExtensionStateConfig[]; // 扩展状态配置
	createdAt: number; // 创建时间
	updatedAt: number; // 更新时间
}

// 存储结构
interface ProfilesStorage {
	profileGroups: ProfileGroup[]; // 所有配置组
	globalEnabled: boolean; // 全局开关
	lastMatchedProfile: string | null; // 最近匹配的配置组 ID
}
```

### 3. 核心模块设计

#### 3.1 URL 匹配模块 (`source/lib/url-matcher.ts`)

```typescript
// 核心函数
function matchUrl(url: string, condition: MatchCondition): boolean;
function wildcardToRegex(pattern: string): RegExp;
function hostWildcardToRegex(pattern: string): RegExp;
function findMatchingProfile(
	url: string,
	profiles: ProfileGroup[],
): ProfileGroup | null;
```

#### 3.2 扩展状态管理模块 (`source/lib/extension-state-manager.ts`)

```typescript
// 保存和恢复扩展状态
function saveCurrentState(): Promise<Map<string, boolean>>;
function applyProfileState(profile: ProfileGroup): Promise<void>;
function restoreOriginalState(): Promise<void>;
```

#### 3.3 后台脚本增强 (`source/background.ts`)

使用 `chrome.webNavigation.onBeforeNavigate` 事件监听页面导航，在页面开始加载前切换扩展状态。

### 4. 权限需求

需要在 `manifest.json` 中添加以下权限：

- `webNavigation` - 监听页面导航事件
- `tabs` - 获取当前标签页 URL

### 5. UI 设计

#### 5.1 配置组列表页面

- 显示所有配置组
- 支持启用/禁用配置组
- 支持添加/编辑/删除配置组
- 支持调整优先级

#### 5.2 配置组编辑页面

- 配置组名称输入
- URL 条件列表（支持添加多个条件）
- 扩展状态配置（显示所有已安装扩展，可设置目标状态）

### 6. 执行流程

```
用户访问网页
    ↓
chrome.webNavigation.onBeforeNavigate 触发
    ↓
获取目标 URL
    ↓
遍历所有启用的配置组（按优先级排序）
    ↓
对每个配置组，检查 URL 是否匹配任一条件
    ↓
找到第一个匹配的配置组
    ↓
保存当前扩展状态（首次）
    ↓
应用配置组中的扩展状态
    ↓
页面加载
```

## 任务拆分

### Phase 1: 基础设施

- [x] 任务 1: 创建设计文档
- [x] 任务 2: 设计 URL 匹配模块 (`source/lib/url-matcher.ts`)
- [x] 任务 3: 定义配置组类型 (`source/lib/types.ts`)
- [x] 任务 4: 更新存储模块 (`source/options-storage.ts`)

### Phase 2: 核心功能

- [x] 任务 5: 实现后台 URL 监听逻辑 (`source/background.ts`)
- [x] 任务 6: 创建扩展状态管理模块 (`source/lib/extension-state-manager.ts`)

### Phase 3: 用户界面

- [x] 任务 7: 创建配置组管理页面 (`source/profiles/`)
- [x] 任务 8: 添加国际化文本

### Phase 4: 集成与测试

- [x] 任务 9: 更新 manifest.json 和构建配置
- [x] 任务 10: 测试和验证

## 参考项目

- [SwitchyOmega](https://github.com/FelisCatus/SwitchyOmega) - URL 匹配规则设计
- [ZeroOmega](https://github.com/zero-peak/ZeroOmega) - MV3 兼容实现

## 注意事项

1. **性能考虑**：URL 匹配需要高效，避免使用过于复杂的正则表达式
2. **用户体验**：切换扩展状态时可能需要重新加载页面才能生效
3. **错误处理**：某些扩展可能无法被禁用（如策略安装的扩展）
4. **状态恢复**：用户离开匹配的网页时，是否恢复原状态（可选配置）
