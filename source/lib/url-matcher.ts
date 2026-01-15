/**
 * URL Matching Module
 *
 * Provides URL matching functionality for profile groups.
 * Supports three types of matching:
 * 1. Host Wildcard - Match domain names with wildcards
 * 2. URL Wildcard - Match full URLs with wildcards
 * 3. Regex - Match with regular expressions
 *
 * Inspired by SwitchyOmega's condition matching system.
 */

import type {MatchCondition, MatchType, ProfileGroup} from './types';

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Converts a host wildcard pattern to a regular expression
 *
 * Supports:
 * - `*.example.com` or `.example.com` - matches example.com and all subdomains
 * - `**.example.com` - matches only subdomains, not the main domain
 * - `example.*` - matches any TLD
 * - `*` in the middle - matches any characters
 */
export function hostWildcardToRegex(pattern: string): RegExp {
	let regexStr: string;
	let normalizedPattern = pattern;

	// Handle `.example.com` shorthand (same as `*.example.com`)
	if (normalizedPattern.startsWith('.')) {
		normalizedPattern = `*${normalizedPattern}`;
	}

	// Handle `**.` prefix - only match subdomains
	if (normalizedPattern.startsWith('**.')) {
		const domain = normalizedPattern.slice(3);
		const escapedDomain = escapeRegex(domain);
		regexStr = `^.+\\.${escapedDomain}$`;
	}
	// Handle `*.` prefix - match domain and subdomains
	else if (normalizedPattern.startsWith('*.')) {
		const domain = normalizedPattern.slice(2);
		const escapedDomain = escapeRegex(domain);
		// Match: subdomain.example.com OR example.com
		regexStr = `^(.*\\.)?${escapedDomain}$`;
	}
	// Regular wildcard pattern
	else {
		// Replace * with .* for regex matching
		regexStr = `^${escapeRegex(normalizedPattern).replace(/\\\*/g, '.*')}$`;
	}

	return new RegExp(regexStr, 'i');
}

/**
 * Converts a URL wildcard pattern to a regular expression
 *
 * Supports:
 * - `*` matches any characters (except nothing for protocol)
 * - `*://example.com/*` - matches any protocol and path
 * - `https://*.example.com/*` - matches any subdomain
 */
export function urlWildcardToRegex(pattern: string): RegExp {
	// Escape special regex characters except *
	let regexStr = pattern
		.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
		.replace(/\*/g, '.*');

	// Ensure full string match
	if (!regexStr.startsWith('^')) {
		regexStr = `^${regexStr}`;
	}
	if (!regexStr.endsWith('$')) {
		regexStr = `${regexStr}$`;
	}

	return new RegExp(regexStr, 'i');
}

/**
 * Extracts the host from a URL
 */
export function extractHost(url: string): string {
	try {
		const urlObj = new URL(url);
		return urlObj.hostname;
	} catch {
		// If URL parsing fails, try to extract host manually
		const match = url.match(/^(?:\w+:\/\/)?([^/:]+)/);
		return match ? match[1] : '';
	}
}

/**
 * Tests if a URL matches a condition
 */
export function matchUrl(url: string, condition: MatchCondition): boolean {
	if (!condition.enabled) {
		return false;
	}

	try {
		switch (condition.type) {
			case 'host-wildcard': {
				const host = extractHost(url);
				const regex = hostWildcardToRegex(condition.pattern);
				return regex.test(host);
			}

			case 'url-wildcard': {
				const regex = urlWildcardToRegex(condition.pattern);
				return regex.test(url);
			}

			case 'regex': {
				const regex = new RegExp(condition.pattern, 'i');
				return regex.test(url);
			}

			default:
				return false;
		}
	} catch {
		// If pattern is invalid (e.g., bad regex), return false
		console.warn(
			`[URL Matcher] Invalid pattern: ${condition.pattern}`,
			condition,
		);
		return false;
	}
}

/**
 * Tests if a URL matches any condition in a profile
 */
export function matchProfile(url: string, profile: ProfileGroup): boolean {
	if (!profile.enabled || profile.conditions.length === 0) {
		return false;
	}

	// OR relationship: match if any condition matches
	return profile.conditions.some(condition => matchUrl(url, condition));
}

/**
 * Finds the first matching profile for a URL
 * Profiles are checked in order of priority (highest first)
 */
export function findMatchingProfile(
	url: string,
	profiles: ProfileGroup[],
): ProfileGroup | null {
	// Sort by priority (descending)
	const sortedProfiles = [...profiles].sort((a, b) => b.priority - a.priority);

	for (const profile of sortedProfiles) {
		if (matchProfile(url, profile)) {
			return profile;
		}
	}

	return null;
}

/**
 * Validates a match condition pattern
 * Returns an error message if invalid, or null if valid
 */
export function validatePattern(
	pattern: string,
	type: MatchType,
): string | null {
	if (!pattern || pattern.trim().length === 0) {
		return 'Pattern cannot be empty';
	}

	if (type === 'regex') {
		try {
			// Test if the regex is valid by creating it
			const testRegex = new RegExp(pattern);
			// Use the regex to avoid "unused variable" warning
			testRegex.test('');
		} catch (e) {
			return `Invalid regular expression: ${e instanceof Error ? e.message : String(e)}`;
		}
	}

	return null;
}

/**
 * Creates a new match condition with a unique ID
 */
export function createMatchCondition(
	type: MatchType,
	pattern: string,
): MatchCondition {
	return {
		id: crypto.randomUUID(),
		type,
		pattern,
		enabled: true,
	};
}

/**
 * Creates a new profile group with a unique ID
 */
export function createProfileGroup(
	name: string,
	priority: number = 0,
): ProfileGroup {
	const now = Date.now();
	return {
		id: crypto.randomUUID(),
		name,
		enabled: true,
		priority,
		conditions: [],
		extensionStates: [],
		createdAt: now,
		updatedAt: now,
	};
}
