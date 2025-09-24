import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  Firestore,
  collection,
  collectionData,
  doc,
  setDoc,
  serverTimestamp,
  Timestamp,
  query,
  where,
  getDocs,
} from '@angular/fire/firestore';
import {
  Storage,
  ref,
  uploadBytes,
  getDownloadURL,
} from '@angular/fire/storage';

import { BrandsStore } from '../../stores/brands.store';

/* ------------ Types ------------ */
type Tag = {
  id: string;
  name: string;
  group?: 'family' | 'note' | 'mood' | 'season' | 'gender' | 'occasion';
  order?: number;
};

type Perfume = {
  name: string;
  tags: string[];
  categories: string[]; // mirror for current UI
  imageUrl: string;
  imagePath: string;
  searchableName: string;
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;

  // brand linkage (new)
  brandId?: string | null;
  brandName?: string | null;

  // legacy (kept for backwards compatibility; we don't write it anymore)
  brand?: string;

  line?: string;
  description?: string;
};

@Component({
  selector: 'app-add-perfume',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-perfume.component.html',
  styleUrls: ['./add-perfume.component.scss'],
})
export class AddPerfumeComponent implements OnInit {
  private fb = inject(FormBuilder);
  private firestore = inject(Firestore);
  private storage = inject(Storage);
  private brandsStore = inject(BrandsStore);

  // expose brands signal to template
  brands = this.brandsStore.visibleBrands;

  // UI state
  saving = signal(false);
  successMsg = signal<string | null>(null);
  errorMsg = signal<string | null>(null);

  // Image state
  imageFile: File | null = null;
  imagePreviewUrl = signal<string | null>(null);
  isDragging = signal(false);

  // Load tags from Firestore
  tags$: Observable<Tag[]> = collectionData(
    collection(this.firestore, 'tags'),
    { idField: 'id' }
  ) as Observable<Tag[]>;

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    brandId: [''], // <-- dropdown binds here
    description: [''],
    tags: this.fb.control<string[]>([], { nonNullable: true }),
  });

  ngOnInit() {
    // ensure brands list is available for the dropdown
    this.brandsStore.loadOnce();
  }

  get tagsControl() {
    return this.form.controls.tags;
  }

  // -------- Image handlers --------
  onPaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items as DataTransferItemList | undefined;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it && it.type.startsWith('image/')) {
        const file = it.getAsFile();
        if (file) {
          this.setImageFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file) this.setImageFile(file);
    if (input) input.value = '';
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.isDragging.set(true);
  }
  onDragLeave(e: DragEvent) {
    e.preventDefault();
    this.isDragging.set(false);
  }
  onDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragging.set(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      this.setImageFile(file);
    }
  }

  removeImage() {
    this.imageFile = null;
    this.imagePreviewUrl.set(null);
  }

  private setImageFile(file: File) {
    if (!file.type.startsWith('image/')) {
      this.errorMsg.set('Please paste or upload an image file.');
      return;
    }
    this.imageFile = file;
    this.errorMsg.set(null);

    const reader = new FileReader();
    reader.onload = () => this.imagePreviewUrl.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  // -------- Checkbox toggle helper --------
  toggleTag(tagId: string, checked: boolean) {
    const current = this.tagsControl.value ?? [];
    if (checked) {
      if (!current.includes(tagId)) {
        this.tagsControl.setValue([...current, tagId]);
      }
    } else {
      this.tagsControl.setValue(current.filter((id) => id !== tagId));
    }
  }

  // -------- Submit handler --------
  async save() {
    this.successMsg.set(null);
    this.errorMsg.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg.set('Please fill in the required fields.');
      return;
    }
    if (!this.imageFile) {
      this.errorMsg.set('Please paste or upload an image.');
      return;
    }

    const name = this.form.value.name!.trim();
    const description = (this.form.value.description ?? '').trim();
    const tagIds = Array.from(new Set(this.form.value.tags ?? []));

    // brand from dropdown
    const brandId = this.form.value.brandId || '';
    const selectedBrand = brandId
      ? this.brands().find((b) => b.id === brandId)
      : undefined;

    this.saving.set(true);
    try {
      // Duplicate guard
      const perfumesCol = collection(this.firestore, 'perfumes');
      const qy = query(
        perfumesCol,
        where('searchableName', '==', name.toLocaleLowerCase())
      );
      const snap = await getDocs(qy);
      if (!snap.empty) {
        this.errorMsg.set('A perfume with this name already exists.');
        this.saving.set(false);
        return;
      }

      // Pre-create ID
      const newDocRef = doc(perfumesCol);
      const id = newDocRef.id;

      // Upload image
      const ext =
        this.getFileExtension(this.imageFile.name) ||
        this.guessExt(this.imageFile.type) ||
        'jpg';
      const imagePath = `images/perfumes/${id}.${ext}`;
      const storageRef = ref(this.storage, imagePath);
      await uploadBytes(storageRef, this.imageFile, {
        contentType: this.imageFile.type || 'image/jpeg',
        cacheControl: 'public, max-age=31536000, immutable',
      });
      const imageUrl = await getDownloadURL(storageRef);

      // Write doc
      const payload: Perfume = {
        name,
        tags: tagIds,
        categories: tagIds, // keep current UI working
        imageUrl,
        imagePath,
        searchableName: name.toLocaleLowerCase(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        description,

        // brand linkage
        brandId: selectedBrand ? selectedBrand.id : null,
        brandName: selectedBrand ? selectedBrand.name : null,

        ...(description ? { description } : {}),
      };

      await setDoc(newDocRef, payload);

      this.successMsg.set('Perfume saved successfully.');
      this.form.reset({ name: '', brandId: '', description: '', tags: [] });
      this.removeImage();
    } catch (err: any) {
      console.error(err);
      this.errorMsg.set(err?.message ?? 'Failed to save perfume.');
    } finally {
      this.saving.set(false);
    }
  }

  private getFileExtension(filename: string): string | null {
    const i = filename.lastIndexOf('.');
    if (i === -1) return null;
    return filename.substring(i + 1).toLowerCase();
  }

  private guessExt(mime: string | null | undefined): string | null {
    if (!mime) return null;
    if (mime === 'image/jpeg') return 'jpg';
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    return null;
  }

  readonly tagsByGroup$ = this.tags$.pipe(
    map((tags) => {
      const by = {
        gender: [] as Tag[],
        family: [] as Tag[],
        note: [] as Tag[],
        other: [] as Tag[],
      };
      for (const t of tags) {
        const g = (t.group ?? 'other') as keyof typeof by;
        (by[g] ?? by.other).push(t);
      }
      // sort inside each group
      const sort = (a: Tag, b: Tag) =>
        (a.order ?? 9999) - (b.order ?? 9999) || a.name.localeCompare(b.name);
      by.gender.sort(sort);
      by.family.sort(sort);
      by.note.sort(sort);
      by.other.sort(sort);
      return by;
    })
  );
}
