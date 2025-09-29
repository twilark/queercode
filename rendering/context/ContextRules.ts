// Settings-based context filtering rules
// Simple helper for determining which contexts should be filtered

import { QueercodeSettingsData } from "../../ui/QueercodeSettings";

/**
 * Provides simple settings-based rule checking for context filtering
 *
 * This class provides a clean interface for checking whether specific
 * context types should allow emoji rendering based on user settings.
 */
export class ContextRules {
  constructor(private settings: QueercodeSettingsData) {}

  /**
   * Should emoji rendering be skipped in code blocks?
   * @returns true if code blocks should be skipped
   */
  shouldSkipCodeBlocks(): boolean {
    return !this.settings.renderInCodeblocks;
  }

  /**
   * Should emoji rendering be skipped in inline code?
   * @returns true if inline code should be skipped
   */
  shouldSkipInlineCode(): boolean {
    return !this.settings.renderInInlineCode;
  }

  /**
   * Should emoji rendering be skipped in URLs/links?
   * @returns true if URLs should be skipped
   */
  shouldSkipUrls(): boolean {
    return !this.settings.renderInUrls;
  }

  /**
   * Should emoji rendering be skipped in frontmatter?
   * @returns true if frontmatter should be skipped
   */
  shouldSkipFrontmatter(): boolean {
    return !this.settings.renderInFrontmatter;
  }

  /**
   * Should emoji rendering be skipped in comments?
   * @returns true if comments should be skipped
   */
  shouldSkipComments(): boolean {
    return !this.settings.renderInComments;
  }

  /**
   * Get all context filtering rules as a summary object
   * Useful for debugging and logging
   */
  getAllRules(): {
    skipCodeBlocks: boolean;
    skipInlineCode: boolean;
    skipUrls: boolean;
    skipFrontmatter: boolean;
    skipComments: boolean;
  } {
    return {
      skipCodeBlocks: this.shouldSkipCodeBlocks(),
      skipInlineCode: this.shouldSkipInlineCode(),
      skipUrls: this.shouldSkipUrls(),
      skipFrontmatter: this.shouldSkipFrontmatter(),
      skipComments: this.shouldSkipComments()
    };
  }

  /**
   * Check if any context filtering is enabled
   * @returns true if any filtering rules are active
   */
  hasAnyFiltering(): boolean {
    const rules = this.getAllRules();
    return Object.values(rules).some(shouldSkip => shouldSkip);
  }

  /**
   * Update settings and return new rules instance
   * Useful for settings changes without recreating the entire component tree
   */
  withSettings(newSettings: QueercodeSettingsData): ContextRules {
    return new ContextRules(newSettings);
  }
}