import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { provideHttpClient } from '@angular/common/http';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';

import { AddVanModalComponent } from './add-van-modal.component';

// Mock Firebase config for testing
const mockFirebaseConfig = {
  apiKey: 'test-api-key',
  authDomain: 'test-project.firebaseapp.com',
  projectId: 'test-project',
  storageBucket: 'test-project.firebasestorage.app',
  messagingSenderId: '123456789',
  appId: 'test-app-id'
};

describe('AddVanModalComponent', () => {
  let component: AddVanModalComponent;
  let fixture: ComponentFixture<AddVanModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AddVanModalComponent,
        IonicModule.forRoot()
      ],
      providers: [
        provideHttpClient(),
        provideFirebaseApp(() => initializeApp(mockFirebaseConfig)),
        provideFirestore(() => getFirestore())
      ]
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
