// src/app/pages/van-detail/van-detail.page.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VanDetailsPage } from './van-details.page';

describe('VanDetailPage', () => {
  let component: VanDetailsPage;
  let fixture: ComponentFixture<VanDetailsPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [VanDetailsPage]
    });
    fixture = TestBed.createComponent(VanDetailsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});