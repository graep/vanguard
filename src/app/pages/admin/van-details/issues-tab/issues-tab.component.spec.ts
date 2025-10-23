import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';

import { IssuesTabComponent } from './issues-tab.component';

// Mock Firebase config for testing
const mockFirebaseConfig = {
  apiKey: 'test-api-key',
  authDomain: 'test-project.firebaseapp.com',
  projectId: 'test-project',
  storageBucket: 'test-project.firebasestorage.app',
  messagingSenderId: '123456789',
  appId: 'test-app-id'
};

describe('IssuesTabComponent', () => {
  let component: IssuesTabComponent;
  let fixture: ComponentFixture<IssuesTabComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ 
        IssuesTabComponent, // Import standalone component instead of declaring
        IonicModule.forRoot() 
      ],
      providers: [
        provideFirebaseApp(() => initializeApp(mockFirebaseConfig)),
        provideFirestore(() => getFirestore()),
        provideStorage(() => getStorage())
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(IssuesTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
