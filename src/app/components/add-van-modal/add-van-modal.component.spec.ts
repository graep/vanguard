import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddVanModalComponent } from './add-van-modal.component';

describe('AddVanModalComponent', () => {
  let component: AddVanModalComponent;
  let fixture: ComponentFixture<AddVanModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddVanModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddVanModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
