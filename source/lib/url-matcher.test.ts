/**
 * URL Matcher Test Cases
 *
 * Run with: npx vitest run source/lib/url-matcher.test.ts
 */

import {describe, expect, it} from 'vitest';
import {
	createMatchCondition,
	createProfileGroup,
	extractHost,
	findMatchingProfile,
	hostWildcardToRegex,
	matchProfile,
	matchUrl,
	urlWildcardToRegex,
	validatePattern,
} from './url-matcher';

describe('hostWildcardToRegex', () => {
	it('should match exact domain', () => {
		const regex = hostWildcardToRegex('example.com');
		expect(regex.test('example.com')).toBe(true);
		expect(regex.test('sub.example.com')).toBe(false);
		expect(regex.test('example.org')).toBe(false);
	});

	it('should match wildcard subdomain (*.example.com)', () => {
		const regex = hostWildcardToRegex('*.example.com');
		expect(regex.test('example.com')).toBe(true);
		expect(regex.test('sub.example.com')).toBe(true);
		expect(regex.test('a.b.example.com')).toBe(true);
		expect(regex.test('notexample.com')).toBe(false);
	});

	it('should match .example.com shorthand', () => {
		const regex = hostWildcardToRegex('.example.com');
		expect(regex.test('example.com')).toBe(true);
		expect(regex.test('sub.example.com')).toBe(true);
	});

	it('should match **.example.com (subdomain only)', () => {
		const regex = hostWildcardToRegex('**.example.com');
		expect(regex.test('example.com')).toBe(false);
		expect(regex.test('sub.example.com')).toBe(true);
		expect(regex.test('a.b.example.com')).toBe(true);
	});

	it('should match wildcard TLD', () => {
		const regex = hostWildcardToRegex('example.*');
		expect(regex.test('example.com')).toBe(true);
		expect(regex.test('example.org')).toBe(true);
		expect(regex.test('example.co.uk')).toBe(true);
	});
});

describe('urlWildcardToRegex', () => {
	it('should match URL with wildcards', () => {
		const regex = urlWildcardToRegex('*://example.com/*');
		expect(regex.test('https://example.com/')).toBe(true);
		expect(regex.test('https://example.com/path')).toBe(true);
		expect(regex.test('http://example.com/path/to/page')).toBe(true);
		expect(regex.test('https://sub.example.com/')).toBe(false);
	});

	it('should match specific protocol', () => {
		const regex = urlWildcardToRegex('https://example.com/*');
		expect(regex.test('https://example.com/page')).toBe(true);
		expect(regex.test('http://example.com/page')).toBe(false);
	});

	it('should match subdomain wildcard in URL', () => {
		const regex = urlWildcardToRegex('https://*.example.com/*');
		expect(regex.test('https://sub.example.com/page')).toBe(true);
		expect(regex.test('https://a.b.example.com/page')).toBe(true);
		expect(regex.test('https://example.com/page')).toBe(false);
	});
});

describe('extractHost', () => {
	it('should extract host from URL', () => {
		expect(extractHost('https://example.com/path')).toBe('example.com');
		expect(extractHost('http://sub.example.com:8080/path')).toBe(
			'sub.example.com',
		);
		expect(extractHost('https://localhost:3000/')).toBe('localhost');
	});

	it('should handle invalid URLs gracefully', () => {
		expect(extractHost('not-a-url')).toBe('not-a-url');
		expect(extractHost('')).toBe('');
	});
});

describe('matchUrl', () => {
	it('should match host-wildcard condition', () => {
		const condition = createMatchCondition('host-wildcard', '*.github.com');
		expect(matchUrl('https://github.com/user/repo', condition)).toBe(true);
		expect(matchUrl('https://gist.github.com/user', condition)).toBe(true);
		expect(matchUrl('https://gitlab.com/user', condition)).toBe(false);
	});

	it('should match url-wildcard condition', () => {
		const condition = createMatchCondition(
			'url-wildcard',
			'https://github.com/*/settings/*',
		);
		expect(
			matchUrl('https://github.com/user/settings/profile', condition),
		).toBe(true);
		expect(matchUrl('https://github.com/user/repo', condition)).toBe(false);
	});

	it('should match regex condition', () => {
		const condition = createMatchCondition(
			'regex',
			'^https://.*\\.google\\.(com|co\\.uk)/.*$',
		);
		expect(matchUrl('https://www.google.com/search', condition)).toBe(true);
		expect(matchUrl('https://mail.google.co.uk/inbox', condition)).toBe(true);
		expect(matchUrl('https://www.google.de/search', condition)).toBe(false);
	});

	it('should not match disabled condition', () => {
		const condition = createMatchCondition('host-wildcard', '*.example.com');
		condition.enabled = false;
		expect(matchUrl('https://example.com/', condition)).toBe(false);
	});
});

describe('matchProfile', () => {
	it('should match profile when any condition matches', () => {
		const profile = createProfileGroup('Test Profile');
		profile.conditions = [
			createMatchCondition('host-wildcard', '*.github.com'),
			createMatchCondition('host-wildcard', '*.gitlab.com'),
		];

		expect(matchProfile('https://github.com/', profile)).toBe(true);
		expect(matchProfile('https://gitlab.com/', profile)).toBe(true);
		expect(matchProfile('https://bitbucket.org/', profile)).toBe(false);
	});

	it('should not match disabled profile', () => {
		const profile = createProfileGroup('Test Profile');
		profile.enabled = false;
		profile.conditions = [
			createMatchCondition('host-wildcard', '*.github.com'),
		];

		expect(matchProfile('https://github.com/', profile)).toBe(false);
	});

	it('should not match profile with no conditions', () => {
		const profile = createProfileGroup('Empty Profile');
		expect(matchProfile('https://example.com/', profile)).toBe(false);
	});
});

describe('findMatchingProfile', () => {
	it('should find first matching profile by priority', () => {
		const lowPriority = createProfileGroup('Low Priority');
		lowPriority.priority = 1;
		lowPriority.conditions = [
			createMatchCondition('host-wildcard', '*.example.com'),
		];

		const highPriority = createProfileGroup('High Priority');
		highPriority.priority = 10;
		highPriority.conditions = [
			createMatchCondition('host-wildcard', '*.example.com'),
		];

		const profiles = [lowPriority, highPriority];

		const match = findMatchingProfile('https://example.com/', profiles);
		expect(match).not.toBeNull();
		expect(match!.name).toBe('High Priority');
	});

	it('should return null when no profile matches', () => {
		const profile = createProfileGroup('Test Profile');
		profile.conditions = [
			createMatchCondition('host-wildcard', '*.github.com'),
		];

		const match = findMatchingProfile('https://example.com/', [profile]);
		expect(match).toBeNull();
	});
});

describe('validatePattern', () => {
	it('should validate non-empty patterns', () => {
		expect(validatePattern('', 'host-wildcard')).not.toBeNull();
		expect(validatePattern('   ', 'host-wildcard')).not.toBeNull();
		expect(validatePattern('*.example.com', 'host-wildcard')).toBeNull();
	});

	it('should validate regex patterns', () => {
		expect(validatePattern('^valid$', 'regex')).toBeNull();
		expect(validatePattern('[invalid', 'regex')).not.toBeNull();
	});
});
