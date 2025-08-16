import { TestBed } from '@angular/core/testing';

import { VanService } from './van.service';

describe('VanService', () => {
  let service: VanService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VanService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
