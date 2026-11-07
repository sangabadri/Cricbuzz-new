import { describe, it, expect } from 'vitest';
import { getTeamIdentity } from '../teamColors';

describe('getTeamIdentity', () => {
  describe('Known Teams', () => {
    it('returns predefined identity for India', () => {
      const identity = getTeamIdentity('India');
      expect(identity.name).toBe('India');
      expect(identity.shortCode).toBe('IND');
      expect(identity.primaryColor).toBe('#1d4ed8');
      expect(identity.badgeBg).toBe('bg-blue-600/15');
      expect(identity.borderBadge).toBe('border-blue-500/40');
      expect(identity.textColor).toBe('text-blue-400');
      expect(identity.accentColor).toBe('#60a5fa');
    });

    it('handles case-insensitivity and leading/trailing whitespace', () => {
      const lower = getTeamIdentity('india');
      const upper = getTeamIdentity('INDIA');
      const padded = getTeamIdentity('  India  ');

      expect(lower.shortCode).toBe('IND');
      expect(upper.shortCode).toBe('IND');
      expect(padded.shortCode).toBe('IND');
      expect(lower.primaryColor).toBe('#1d4ed8');
      expect(upper.primaryColor).toBe('#1d4ed8');
      expect(padded.primaryColor).toBe('#1d4ed8');
    });

    it('returns predefined identity for all known international teams', () => {
      const testCases = [
        { name: 'Australia', expectedCode: 'AUS', color: '#eab308' },
        { name: 'England', expectedCode: 'ENG', color: '#dc2626' },
        { name: 'Pakistan', expectedCode: 'PAK', color: '#16a34a' },
        { name: 'South Africa', expectedCode: 'SA', color: '#059669' },
        { name: 'New Zealand', expectedCode: 'NZ', color: '#334155' },
        { name: 'West Indies', expectedCode: 'WI', color: '#9f1239' },
      ];

      for (const tc of testCases) {
        const identity = getTeamIdentity(tc.name);
        expect(identity.shortCode).toBe(tc.expectedCode);
        expect(identity.primaryColor).toBe(tc.color);
      }
    });
  });

  describe('Dynamic Acronym Generation', () => {
    it('generates 3-letter acronym for 3-or-more word team names', () => {
      const identity = getTeamIdentity('Chennai Super Kings');
      expect(identity.shortCode).toBe('CSK');
      expect(identity.name).toBe('Chennai Super Kings');
    });

    it('generates acronym for 2-word team names using first letter of first word and first two letters of second word', () => {
      const identity = getTeamIdentity('Royal Challengers');
      // words[0][0] = 'R', words[1][0] = 'C', words[1][1] = 'H' -> 'RCH'
      expect(identity.shortCode).toBe('RCH');
    });

    it('generates acronym for single-word team names with 3 or more letters', () => {
      const identity = getTeamIdentity('Titans');
      expect(identity.shortCode).toBe('TIT');
    });

    it('falls back to T + teamId when word length is less than 3', () => {
      const identityWithId = getTeamIdentity('XI', 5);
      expect(identityWithId.shortCode).toBe('T5');

      const identityWithoutId = getTeamIdentity('XI');
      expect(identityWithoutId.shortCode).toBe('T1');
    });
  });

  describe('Defaults and Edge Cases', () => {
    it('handles undefined teamName and teamId gracefully', () => {
      const identity = getTeamIdentity();
      expect(identity.name).toBe('Team');
      expect(identity.shortCode).toBe('T1');
      expect(identity.primaryColor).toBeDefined();
    });

    it('handles empty string teamName with teamId', () => {
      const identity = getTeamIdentity('', 8);
      expect(identity.name).toBe('Team');
      expect(identity.shortCode).toBe('T8');
    });

    it('handles whitespace-only teamName', () => {
      const identity = getTeamIdentity('   ');
      expect(identity.name).toBe('   ');
      expect(identity.shortCode).toBe('T1');
    });
  });

  describe('Deterministic Palette Selection', () => {
    it('returns consistent palettes for identical input combinations', () => {
      const first = getTeamIdentity('Gujarat Titans', 10);
      const second = getTeamIdentity('Gujarat Titans', 10);

      expect(first.primaryColor).toBe(second.primaryColor);
      expect(first.badgeBg).toBe(second.badgeBg);
      expect(first.borderBadge).toBe(second.borderBadge);
      expect(first.textColor).toBe(second.textColor);
      expect(first.accentColor).toBe(second.accentColor);
    });

    it('assigns palettes from available dynamic palette set', () => {
      const identity = getTeamIdentity('Random Team', 3);
      const validPrimaryColors = ['#0284c7', '#7c3aed', '#ea580c', '#0d9488'];
      expect(validPrimaryColors).toContain(identity.primaryColor);
    });
  });
});
