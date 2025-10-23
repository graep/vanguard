// src/app/pages/van-detail/van-detail.page.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { VanDetailsPage } from './van-details.page';

// Mock Firebase config for testing
const mockFirebaseConfig = {
  apiKey: 'test-api-key',
  authDomain: 'test-project.firebaseapp.com',
  projectId: 'test-project',
  storageBucket: 'test-project.firebasestorage.app',
  messagingSenderId: '123456789',
  appId: 'test-app-id'
};

describe('VanDetailPage', () => {
  let component: VanDetailsPage;
  let fixture: ComponentFixture<VanDetailsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VanDetailsPage],
      providers: [
        provideRouter([]),
        provideFirebaseApp(() => initializeApp(mockFirebaseConfig)),
        provideAuth(() => getAuth()),
        provideFirestore(() => getFirestore()),
        provideStorage(() => getStorage())
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(VanDetailsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});