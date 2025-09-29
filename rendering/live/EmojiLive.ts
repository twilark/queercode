// Live Preview emoji rendering with conditional decoration visibility
import { App } from "obsidian";
import { Extension } from "@codemirror/state";
import { ViewPlugin, ViewUpdate, EditorView, Decoration, DecorationSet } from "@codemirror/view";
// Access RangeSet for atomic ranges
// @ts-ignore - External dependency available at runtime
const { RangeSet } = require('@codemirror/state');

import { EmojiCooker } from "../../services/EmojiCooker";
import { QueercodeSettingsData } from "../../ui/QueercodeSettings";
import { EmojiWidget } from "./EmojiWidget";

// Import new modular components
import { CursorProximity } from "./proximity/CursorProximity";
import { ProximityState } from "./proximity/ProximityState";
import { EmojiScanner } from "../scanning/EmojiScanner";
import { SyntaxChecker } from "../context/SyntaxChecker";
import { EmojiDecorator } from "./decorations/EmojiDecorator";
import { DecorationCache } from "./decorations/DecorationCache";
import { ChangeDetector } from "../scanning/ChangeDetector";
import { EmojiLocation } from "../types/EmojiTypes";

/**
 * Proximity-based emoji renderer - refactored with modular components
 * Now coordinates between specialized components instead of handling everything
 */
class EmojiMarker {
  // Component dependencies - injected for clean separation of concerns
  private cursorProximity: CursorProximity;
  private proximityState: ProximityState;
  private emojiScanner: EmojiScanner;
  private changeDetector: ChangeDetector;
  private syntaxChecker: SyntaxChecker;
  private emojiDecorator: EmojiDecorator;
  private decorationCache: DecorationCache;

  // Lifecycle management
  private mapUpdateHandler: (() => void) | null = null;
  private destroyed = false;

  constructor(
    private view: EditorView,
    private emojiService: EmojiCooker,
    private app: App,
    private settings: QueercodeSettingsData
  ) {
    // Initialize all component dependencies
    this.cursorProximity = new CursorProximity();
    this.proximityState = new ProximityState();
    this.emojiScanner = new EmojiScanner(this.emojiService, this.app);
    this.changeDetector = new ChangeDetector();
    this.syntaxChecker = new SyntaxChecker(this.view, this.settings);
    this.emojiDecorator = new EmojiDecorator();
    this.decorationCache = new DecorationCache();

    // Build initial decorations if service is ready
    if (this.emojiService.isInitialized()) {
      try {
        this.refreshDocument();
      } catch (error) {
        console.error("EmojiMarker: Error building initial decorations:", error);
        this.decorationCache.clear();
      }
    }

    // Set up map update handler
    this.mapUpdateHandler = () => {
      if (!this.destroyed) {
        try {
          this.refreshDocument();
        } catch (error) {
          console.error("EmojiMarker: Error rebuilding decorations:", error);
          this.decorationCache.clear();
        }
      }
    };

    this.emojiService.onMapUpdate(this.mapUpdateHandler);
  }

  /**
   * OPTIMIZED: Refresh document analysis and decorations
   * Uses existing components for clean separation of concerns
   */
  private refreshDocument(): void {
    const doc = this.view.state.doc;
    const selection = this.view.state.selection;

    // Scan document for emoji locations
    const allEmojis = this.emojiScanner.scanDocument(doc);

    // Filter emojis by context (code blocks, etc.)
    const contextFilteredEmojis = allEmojis.filter(emoji => {
      try {
        const line = doc.lineAt(emoji.from);
        const lineText = line.text;
        const lineOffset = emoji.from - line.from;
        return this.syntaxChecker.allowsEmojis(emoji.from, lineText, lineOffset);
      } catch (error) {
        console.warn("EmojiMarker: Error processing emoji", emoji.shortcode, error);
        return false;
      }
    });

    // Get proximity state for all emojis at once
    const proximityMap = this.cursorProximity.checkAll(contextFilteredEmojis, selection);

    // Filter to only visible emojis and validate ranges
    const visibleEmojis = this.emojiDecorator.filterVisibleEmojis(contextFilteredEmojis, proximityMap);
    const validEmojis = this.emojiDecorator.validateRanges(visibleEmojis, doc.length);

    // Build decorations using existing component
    const decorationSet = this.emojiDecorator.buildDecorations(validEmojis);

    // Update state and cache
    this.proximityState.update(proximityMap);
    this.decorationCache.update(decorationSet);
  }


  /**
   * SIMPLIFIED: Check proximity changes for selection-only updates
   * Back to simple, reliable approach
   */
  private checkProximityChanges(): void {
    // Use cached emojis but validate their positions are still correct
    let emojis = this.emojiScanner.getCachedEmojis();
    if (emojis.length === 0) return;

    const doc = this.view.state.doc;
    const selection = this.view.state.selection;

    // PERFORMANCE FIX: Validate cached positions and refresh if corrupted
    if (!this.emojiScanner.validateCachedPositions(doc)) {
      // Cache is corrupted, do fresh scan
      emojis = this.emojiScanner.scanDocument(doc);
      if (emojis.length === 0) return;
    }

    // Filter emojis by context (code blocks, etc.)
    const contextFilteredEmojis = emojis.filter(emoji => {
      const line = doc.lineAt(emoji.from);
      const lineText = line.text;
      const lineOffset = emoji.from - line.from;
      return this.syntaxChecker.allowsEmojis(emoji.from, lineText, lineOffset);
    });

    // Get proximity state for all emojis at once
    const proximityMap = this.cursorProximity.checkAll(contextFilteredEmojis, selection);

    // Filter to only visible emojis and validate ranges
    const visibleEmojis = this.emojiDecorator.filterVisibleEmojis(contextFilteredEmojis, proximityMap);
    const validEmojis = this.emojiDecorator.validateRanges(visibleEmojis, doc.length);

    // Build decorations using existing component
    const decorationSet = this.emojiDecorator.buildDecorations(validEmojis);

    // Update state and cache
    this.proximityState.update(proximityMap);
    this.decorationCache.update(decorationSet);
  }


  /**
   * Handle document and selection changes using modular components
   */
  update(update: ViewUpdate): void {
    if (this.destroyed || !this.emojiService.isInitialized()) return;

    if (update.docChanged) {
      const analysis = this.changeDetector.affectsEmojis(update);
      const emojiMap = this.emojiService.getEmojiMap();

      if (analysis.needsRescan || this.changeDetector.detectsEmojiInsertion(update, emojiMap)) {
        // Shortcode content changed OR emoji was inserted - full rescan needed
        this.refreshDocument();
      } else if (analysis.needsPositionMapping) {
        // No shortcode changes - update cached positions
        const positionsChanged = this.emojiScanner.updateCachedPositions(update);
        if (positionsChanged) {
          this.proximityState.clear();
        }
        // Check proximity with updated positions
        this.checkProximityChanges();
      }
    } else if (update.selectionSet) {
      // Selection changed - check proximity only
      this.checkProximityChanges();
    }
  }


  /**
   * Get current decorations
   */
  getDecorations(): DecorationSet {
    return this.decorationCache.get();
  }

  /**
   * Get atomic ranges for visible emoji widgets
   * Uses EmojiDecorator to create atomic ranges from current decorations
   */
  getAtomicRanges(): any {
    const decorations = this.decorationCache.get();
    return this.emojiDecorator.createAtomicRanges(decorations, this.view.state.doc.length);
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.destroyed = true;

    if (this.mapUpdateHandler) {
      this.emojiService.offMapUpdate(this.mapUpdateHandler);
      this.mapUpdateHandler = null;
    }
  }
}

/**
 * Live Preview emoji renderer using simple ViewPlugin
 */
class EmojiLiveRenderer {
  constructor(
    private emojiService: EmojiCooker,
    private app: App,
    private settings: QueercodeSettingsData
  ) {}

  /**
   * Create the CM6 extension with conditional decoration visibility
   * - Shows emoji widgets when cursor is far away (1+ character buffer)
   * - Shows raw shortcode text when cursor is nearby for editing
   * - Atomic ranges ensure visible emojis behave as single units
   * - Perfect copy/paste (always preserves underlying shortcode text)
   */
  public getExtension(): Extension {
    const emojiService = this.emojiService;
    const app = this.app;
    const settings = this.settings;

    const emojiViewPlugin = ViewPlugin.fromClass(class {
      decorator: EmojiMarker;

      constructor(view: EditorView) {
        try {
          this.decorator = new EmojiMarker(view, emojiService, app, settings);
        } catch (error) {
          console.error("Error creating EmojiMarker:", error);
          // Create safe fallback
          this.decorator = {
            getDecorations: () => Decoration.none,
            getAtomicRanges: () => RangeSet.empty,
            update: () => {},
            destroy: () => {}
          } as any;
        }
      }

      update(update: ViewUpdate) {
        try {
          this.decorator.update(update);
        } catch (error) {
          console.error("Error in decorator update:", error);
        }
      }

      destroy() {
        try {
          this.decorator.destroy();
        } catch (error) {
          console.error("Error in decorator destroy:", error);
        }
      }
    }, {
      decorations: (plugin) => {
        try {
          return plugin.decorator.getDecorations();
        } catch (error) {
          console.error("Error getting decorations:", error);
          return Decoration.none;
        }
      }
    });

    // Create atomic ranges facet for clean backspace/delete behavior
    const atomicRanges = EditorView.atomicRanges.of((view) => {
      try {
        const plugin = view.plugin(emojiViewPlugin);
        if (plugin?.decorator?.getAtomicRanges) {
          return plugin.decorator.getAtomicRanges();
        }
        return RangeSet.empty;
      } catch (error) {
        console.error("Error getting atomic ranges:", error);
        return RangeSet.empty;
      }
    });

    return [emojiViewPlugin, atomicRanges];
  }

  /**
   * Refresh - handled by map update subscriptions
   */
  public refresh(): void {
    // Automatic refresh via map update handlers
  }
}

export function EmojiLive(emojiService: EmojiCooker, app: App, settings: QueercodeSettingsData): Extension {
  const renderer = new EmojiLiveRenderer(emojiService, app, settings);
  return renderer.getExtension();
}
