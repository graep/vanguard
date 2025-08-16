import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { VanReportComponent } from './van-report.component';

describe('VanReportComponent', () => {
  let component: VanReportComponent;
  let fixture: ComponentFixture<VanReportComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [VanReportComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VanReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
