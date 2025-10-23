import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';

import { PhotoPeekModalComponent } from './photo-peek-modal.component';

// Mock Firebase config for testing
const mockFirebaseConfig = {
  apiKey: 'test-api-key',
  authDomain: 'test-project.firebaseapp.com',
  projectId: 'test-project',
  storageBucket: 'test-project.firebasestorage.app',
  messagingSenderId: '123456789',
  appId: 'test-app-id'
};

describe('PhotoPeekModalComponent', () => {
  let component: PhotoPeekModalComponent;
  let fixture: ComponentFixture<PhotoPeekModalComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ 
        PhotoPeekModalComponent, // Import standalone component instead of declaring
        IonicModule.forRoot() 
      ],
      providers: [
        provideFirebaseApp(() => initializeApp(mockFirebaseConfig)),
        provideFirestore(() => getFirestore()),
        provideStorage(() => getStorage())
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoPeekModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
