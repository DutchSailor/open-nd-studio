/**
 * Dimensions API - Dimension creation and management
 */

import type { AppState } from '../state/appStore';
import type { TransactionManager } from './transactions';
import type { EntitiesApi } from './entities';
import { toPoint, type ApiPoint } from './types';
import type { DimensionStyle } from '../types/dimension';
import { DEFAULT_DIMENSION_STYLE } from '../constants/cadDefaults';

export class DimensionsApi {
  constructor(
    _getState: () => AppState,
    _transactions: TransactionManager,
    private entities: EntitiesApi
  ) {}

  addLinear(p1: ApiPoint, p2: ApiPoint, offset = 20) {
    return this.entities.add('dimension', {
      dimensionType: 'linear',
      points: [toPoint(p1), toPoint(p2)],
      dimensionLineOffset: offset,
      linearDirection: 'horizontal',
      value: '',
      valueOverridden: false,
    });
  }

  addAligned(p1: ApiPoint, p2: ApiPoint, offset = 20) {
    return this.entities.add('dimension', {
      dimensionType: 'aligned',
      points: [toPoint(p1), toPoint(p2)],
      dimensionLineOffset: offset,
      value: '',
      valueOverridden: false,
    });
  }

  addAngular(vertex: ApiPoint, p1: ApiPoint, p2: ApiPoint, offset = 30) {
    return this.entities.add('dimension', {
      dimensionType: 'angular',
      points: [toPoint(vertex), toPoint(p1), toPoint(p2)],
      dimensionLineOffset: offset,
      value: '',
      valueOverridden: false,
    });
  }

  addRadius(center: ApiPoint, pointOnCircle: ApiPoint) {
    return this.entities.add('dimension', {
      dimensionType: 'radius',
      points: [toPoint(center), toPoint(pointOnCircle)],
      dimensionLineOffset: 0,
      value: '',
      valueOverridden: false,
      prefix: 'R',
    });
  }

  addDiameter(center: ApiPoint, pointOnCircle: ApiPoint) {
    return this.entities.add('dimension', {
      dimensionType: 'diameter',
      points: [toPoint(center), toPoint(pointOnCircle)],
      dimensionLineOffset: 0,
      value: '',
      valueOverridden: false,
      prefix: '⌀',
    });
  }

  getStyle(): DimensionStyle {
    return { ...DEFAULT_DIMENSION_STYLE };
  }

  setStyle(_style: Partial<DimensionStyle>): void {
    // Dimension style is per-shape in this codebase;
    // this would set defaults for new dimensions
    console.warn('Global dimension style setting is stored per-shape. Use entities.update() to modify individual dimension styles.');
  }
}
