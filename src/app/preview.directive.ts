import { AfterViewInit, DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import { preparePreviews } from '../site/worldPreview.ts';

@Directive({ selector: '[appPreviews]' })
export class PreviewDirective implements AfterViewInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroy = inject(DestroyRef);
  ngAfterViewInit(): void { this.destroy.onDestroy(preparePreviews(this.host.nativeElement)); }
}
