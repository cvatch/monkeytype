/**
 * Custom Word Lists Modal
 * Provides UI for creating, editing, and managing custom word lists
 */

import AnimatedModal, { ShowOptions } from "../utils/animated-modal";
import * as Notifications from "../elements/notifications";
import customWordListsManager, { CustomWordList } from "../utils/custom-word-lists";
import { isAuthenticated } from "../firebase";

type State = {
  isEditing: boolean;
  editingListId: string | null;
  currentLists: CustomWordList[];
};

const state: State = {
  isEditing: false,
  editingListId: null,
  currentLists: [],
};

export function show(options?: ShowOptions): void {
  void modal.show({
    ...options,
    beforeAnimation: async () => {
      state.currentLists = customWordListsManager.getAllLists();
      await updateContent();
    },
  });
}

export function hide(): void {
  void modal.hide();
}

async function updateContent(): Promise<void> {
  const modal = document.querySelector(
    "#customWordListsModal .modal"
  ) as HTMLElement;
  
  if (!modal) return;

  const stats = customWordListsManager.getStatistics();
  
  modal.innerHTML = `
    <div class="title">Custom Word Lists</div>
    <div class="subtitle">Create and manage your own word lists for typing practice</div>
    
    <div class="stats">
      <div class="stat">
        <div class="number">${stats.totalLists}</div>
        <div class="label">Total Lists</div>
      </div>
      <div class="stat">
        <div class="number">${stats.totalWords}</div>
        <div class="label">Total Words</div>
      </div>
      <div class="stat">
        <div class="number">${stats.averageWordsPerList}</div>
        <div class="label">Avg Words/List</div>
      </div>
    </div>
    
    <div class="actions">
      <button class="textButton createNewBtn" data-balloon-pos="up" aria-label="Create a new custom word list">
        <i class="fas fa-plus"></i> Create New List
      </button>
      <button class="textButton importBtn" data-balloon-pos="up" aria-label="Import words from text file">
        <i class="fas fa-upload"></i> Import from Text
      </button>
    </div>
    
    ${state.isEditing ? await generateEditForm() : ""}
    
    <div class="lists">
      ${state.currentLists.length === 0 
        ? '<div class="noLists">No custom word lists yet. Create your first list to get started!</div>' 
        : state.currentLists.map(list => generateListItem(list)).join('')
      }
    </div>
  `;

  // Add event listeners
  setupEventListeners();
}

function generateListItem(list: CustomWordList): string {
  const previewWords = list.words.slice(0, 10).join(", ");
  const remainingCount = list.words.length - 10;
  
  return `
    <div class="listItem" data-list-id="${list.id}">
      <div class="listHeader">
        <div class="listInfo">
          <div class="listName">${escapeHtml(list.name)}</div>
          <div class="listMeta">
            <span class="wordCount">${list.words.length} words</span>
            <span class="dateCreated">${new Date(list.dateCreated).toLocaleDateString()}</span>
          </div>
        </div>
        <div class="listActions">
          <button class="textButton useBtn" data-list-id="${list.id}" data-balloon-pos="up" aria-label="Use this list for typing">
            <i class="fas fa-play"></i>
          </button>
          <button class="textButton editBtn" data-list-id="${list.id}" data-balloon-pos="up" aria-label="Edit this list">
            <i class="fas fa-edit"></i>
          </button>
          <button class="textButton exportBtn" data-list-id="${list.id}" data-balloon-pos="up" aria-label="Export this list">
            <i class="fas fa-download"></i>
          </button>
          <button class="textButton deleteBtn" data-list-id="${list.id}" data-balloon-pos="up" aria-label="Delete this list">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      
      ${list.description ? `<div class="listDescription">${escapeHtml(list.description)}</div>` : ""}
      
      <div class="listPreview">
        ${previewWords}${remainingCount > 0 ? ` <span class="moreWords">... and ${remainingCount} more</span>` : ""}
      </div>
      
      ${list.tags && list.tags.length > 0 ? `
        <div class="listTags">
          ${list.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ""}
    </div>
  `;
}

async function generateEditForm(): Promise<string> {
  const editingList = state.editingListId 
    ? customWordListsManager.getListById(state.editingListId) 
    : null;
    
  return `
    <div class="editForm">
      <div class="formTitle">${editingList ? 'Edit List' : 'Create New List'}</div>
      
      <div class="field">
        <label for="listNameInput">Name *</label>
        <input type="text" id="listNameInput" placeholder="Enter list name..." value="${editingList ? escapeHtml(editingList.name) : ''}" maxlength="50" />
      </div>
      
      <div class="field">
        <label for="listDescriptionInput">Description</label>
        <input type="text" id="listDescriptionInput" placeholder="Optional description..." value="${editingList ? escapeHtml(editingList.description || '') : ''}" maxlength="200" />
      </div>
      
      <div class="field">
        <label for="listWordsInput">Words * <span class="wordCount">0 words</span></label>
        <textarea id="listWordsInput" placeholder="Enter words separated by commas or new lines..." rows="8">${editingList ? editingList.words.join(', ') : ''}</textarea>
        <div class="inputHint">Separate words with commas or new lines. Duplicates will be removed automatically.</div>
      </div>
      
      <div class="field">
        <label for="listTagsInput">Tags</label>
        <input type="text" id="listTagsInput" placeholder="Enter tags separated by commas..." value="${editingList ? editingList.tags?.join(', ') || '' : ''}" />
      </div>
      
      <div class="formActions">
        <button class="textButton saveBtn">
          <i class="fas fa-save"></i> ${editingList ? 'Update List' : 'Create List'}
        </button>
        <button class="textButton cancelBtn">
          <i class="fas fa-times"></i> Cancel
        </button>
      </div>
    </div>
  `;
}

function setupEventListeners(): void {
  const modal = document.querySelector("#customWordListsModal .modal") as HTMLElement;
  if (!modal) return;

  // Create new list button
  const createBtn = modal.querySelector(".createNewBtn") as HTMLButtonElement;
  createBtn?.addEventListener("click", () => {
    state.isEditing = true;
    state.editingListId = null;
    void updateContent();
  });

  // Import button
  const importBtn = modal.querySelector(".importBtn") as HTMLButtonElement;
  importBtn?.addEventListener("click", showImportDialog);

  // Edit form buttons
  const saveBtn = modal.querySelector(".saveBtn") as HTMLButtonElement;
  saveBtn?.addEventListener("click", handleSave);

  const cancelBtn = modal.querySelector(".cancelBtn") as HTMLButtonElement;
  cancelBtn?.addEventListener("click", () => {
    state.isEditing = false;
    state.editingListId = null;
    void updateContent();
  });

  // List action buttons
  modal.querySelectorAll(".useBtn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const listId = (e.target as HTMLElement).dataset.listId;
      if (listId) handleUseList(listId);
    });
  });

  modal.querySelectorAll(".editBtn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const listId = (e.target as HTMLElement).dataset.listId;
      if (listId) handleEditList(listId);
    });
  });

  modal.querySelectorAll(".exportBtn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const listId = (e.target as HTMLElement).dataset.listId;
      if (listId) handleExportList(listId);
    });
  });

  modal.querySelectorAll(".deleteBtn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const listId = (e.target as HTMLElement).dataset.listId;
      if (listId) handleDeleteList(listId);
    });
  });

  // Word count update
  const wordsInput = modal.querySelector("#listWordsInput") as HTMLTextAreaElement;
  wordsInput?.addEventListener("input", updateWordCount);
  
  // Initial word count
  updateWordCount();
}

function updateWordCount(): void {
  const wordsInput = document.querySelector("#listWordsInput") as HTMLTextAreaElement;
  const wordCountEl = document.querySelector(".wordCount") as HTMLElement;
  
  if (!wordsInput || !wordCountEl) return;
  
  const words = wordsInput.value
    .split(/[\n,]/)  
    .map(word => word.trim())
    .filter(word => word.length > 0);
    
  wordCountEl.textContent = `${words.length} words`;
}

function handleSave(): void {
  const nameInput = document.querySelector("#listNameInput") as HTMLInputElement;
  const descriptionInput = document.querySelector("#listDescriptionInput") as HTMLInputElement;
  const wordsInput = document.querySelector("#listWordsInput") as HTMLTextAreaElement;
  const tagsInput = document.querySelector("#listTagsInput") as HTMLInputElement;

  if (!nameInput || !wordsInput) return;

  const name = nameInput.value.trim();
  const description = descriptionInput?.value.trim() || "";
  const wordsText = wordsInput.value.trim();
  const tagsText = tagsInput?.value.trim() || "";

  if (!name) {
    Notifications.add("List name is required", -1);
    nameInput.focus();
    return;
  }

  if (!wordsText) {
    Notifications.add("At least one word is required", -1);
    wordsInput.focus();
    return;
  }

  const words = wordsText
    .split(/[\n,]/)
    .map(word => word.trim())
    .filter(word => word.length > 0);

  const tags = tagsText
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);

  if (state.editingListId) {
    // Update existing list
    const success = customWordListsManager.updateList(state.editingListId, {
      name,
      description,
      words,
      tags,
    });
    
    if (success) {
      Notifications.add("List updated successfully", 1);
    } else {
      Notifications.add("Failed to update list", -1);
      return;
    }
  } else {
    // Create new list
    const newList = customWordListsManager.createList(name, words, description, tags);
    
    if (newList) {
      Notifications.add("List created successfully", 1);
    } else {
      Notifications.add("Failed to create list", -1);
      return;
    }
  }

  state.isEditing = false;
  state.editingListId = null;
  state.currentLists = customWordListsManager.getAllLists();
  void updateContent();
}

function handleUseList(listId: string): void {
  const success = customWordListsManager.setActiveList(listId);
  
  if (success) {
    const list = customWordListsManager.getListById(listId);
    if (list) {
      Notifications.add(`Now using "${list.name}" word list`, 1);
      // Here you would integrate with the test mode switching
      // This would need to be connected to the main test configuration
      hide();
    }
  } else {
    Notifications.add("Failed to activate word list", -1);
  }
}

function handleEditList(listId: string): void {
  state.isEditing = true;
  state.editingListId = listId;
  void updateContent();
}

function handleExportList(listId: string): void {
  const exported = customWordListsManager.exportToText(listId, "\n");
  const list = customWordListsManager.getListById(listId);
  
  if (exported && list) {
    // Create download
    const blob = new Blob([exported], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${list.name.replace(/[^a-zA-Z0-9]/g, '_')}_wordlist.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    Notifications.add("Word list exported successfully", 1);
  } else {
    Notifications.add("Failed to export word list", -1);
  }
}

function handleDeleteList(listId: string): void {
  const list = customWordListsManager.getListById(listId);
  
  if (!list) {
    Notifications.add("List not found", -1);
    return;
  }

  if (confirm(`Are you sure you want to delete "${list.name}"? This action cannot be undone.`)) {
    const success = customWordListsManager.deleteList(listId);
    
    if (success) {
      Notifications.add("List deleted successfully", 1);
      state.currentLists = customWordListsManager.getAllLists();
      void updateContent();
    } else {
      Notifications.add("Failed to delete list", -1);
    }
  }
}

function showImportDialog(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt,.csv';
  input.onchange = handleFileImport;
  input.click();
}

function handleFileImport(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target?.result as string;
    const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
    
    const imported = customWordListsManager.importFromText(fileName, content);
    
    if (imported) {
      Notifications.add("Word list imported successfully", 1);
      state.currentLists = customWordListsManager.getAllLists();
      void updateContent();
    } else {
      Notifications.add("Failed to import word list", -1);
    }
  };
  
  reader.readAsText(file);
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

const modal = new AnimatedModal({
  dialogId: "customWordListsModal",
  setup: async (): Promise<void> => {
    const modalEl = $("#customWordListsModal");
    modalEl.find(".modal").html(`
      <div class="title">Loading...</div>
    `);
  },
  customEscapeHandler: (): void => {
    hide();
  },
  customWrapperClickHandler: (): void => {
    hide();
  },
});

export default modal;