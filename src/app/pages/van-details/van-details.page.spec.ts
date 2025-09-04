// src/app/pages/van-detail/van-detail.page.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VanDetailPage } from './van-details.page';

describe('VanDetailPage', () => {
  let component: VanDetailPage;
  let fixture: ComponentFixture<VanDetailPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [VanDetailPage]
    });
    fixture = TestBed.createComponent(VanDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});