import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VanSelectionPage } from './van-selection.page';

describe('VanSelectionPage', () => {
  let component: VanSelectionPage;
  let fixture: ComponentFixture<VanSelectionPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(VanSelectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
