import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FullscreenCameraComponent } from './fullscreen-camera.component';

describe('FullscreenCameraComponent', () => {
  let component: FullscreenCameraComponent;
  let fixture: ComponentFixture<FullscreenCameraComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FullscreenCameraComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FullscreenCameraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
