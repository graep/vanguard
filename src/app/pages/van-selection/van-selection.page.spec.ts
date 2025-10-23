import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { VanSelectionPage } from './van-selection.page';

// Mock Firebase config for testing
const mockFirebaseConfig = {
  apiKey: 'test-api-key',
  authDomain: 'test-project.firebaseapp.com',
  projectId: 'test-project',
  storageBucket: 'test-project.firebasestorage.app',
  messagingSenderId: '123456789',
  appId: 'test-app-id'
};

describe('VanSelectionPage', () => {
  let component: VanSelectionPage;
  let fixture: ComponentFixture<VanSelectionPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VanSelectionPage],
      providers: [
        provideRouter([]),
        provideFirebaseApp(() => initializeApp(mockFirebaseConfig)),
        provideAuth(() => getAuth()),
        provideFirestore(() => getFirestore())
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VanSelectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
