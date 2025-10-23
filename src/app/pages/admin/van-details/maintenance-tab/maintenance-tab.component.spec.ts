import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';

import { MaintenanceTabComponent } from './maintenance-tab.component';

// Mock Firebase config for testing
const mockFirebaseConfig = {
  apiKey: 'test-api-key',
  authDomain: 'test-project.firebaseapp.com',
  projectId: 'test-project',
  storageBucket: 'test-project.firebasestorage.app',
  messagingSenderId: '123456789',
  appId: 'test-app-id'
};

describe('MaintenanceTabComponent', () => {
  let component: MaintenanceTabComponent;
  let fixture: ComponentFixture<MaintenanceTabComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ 
        MaintenanceTabComponent, // Import standalone component instead of declaring
        IonicModule.forRoot() 
      ],
      providers: [
        provideFirebaseApp(() => initializeApp(mockFirebaseConfig)),
        provideFirestore(() => getFirestore())
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MaintenanceTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
