/**
 * ListsScreen.tsx
 *
 * Dedicated screen for Checklists and Sticky Notes.
 * Enforces:
 *  - Max 5 lists, max 30 items per list with checkbox completion.
 *  - Max 10 sticky notes, max 255 characters per note with selectable colors.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from '../../components/layout/SafeAreaView';
import { Header } from '../../components/layout/Header';
import { AppIcon } from '../../components/ui/AppIcon';
import { ThemedAlert, ThemedAlertProps } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { useListContext } from '../../context/ListContext';
import {
  MAX_LISTS,
  MAX_ITEMS_PER_LIST,
  MAX_STICKY_NOTES,
  MAX_NOTE_CHARACTERS,
  STICKY_COLORS,
  Checklist,
  StickyNote,
} from '../../types/List';

export default function ListsScreen() {
  const { colors, isDark } = useTheme();
  const {
    checklists,
    stickyNotes,
    createChecklist,
    deleteChecklist,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    createStickyNote,
    updateStickyNote,
    deleteStickyNote,
  } = useListContext();

  const [activeTab, setActiveTab] = useState<'lists' | 'notes'>('lists');
  const [alertConfig, setAlertConfig] = useState<ThemedAlertProps | null>(null);

  // ── Create List Modal State ────────────────────────────────────────────────
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');

  // ── Add Item Inline State ──────────────────────────────────────────────────
  const [newItemTextByList, setNewItemTextByList] = useState<Record<string, string>>({});

  // ── Sticky Note Modal State ────────────────────────────────────────────────
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [selectedColor, setSelectedColor] = useState('yellow');

  // ── Checklist Handlers ─────────────────────────────────────────────────────

  const handleOpenCreateList = () => {
    if (checklists.length >= MAX_LISTS) {
      setAlertConfig({
        visible: true,
        title: 'List Limit Reached',
        message: `You cannot create more than ${MAX_LISTS} lists. Delete an existing list to create a new one.`,
        icon: 'alert-circle-outline',
        iconColor: colors.warning || '#f59e0b',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(null) }],
        onClose: () => setAlertConfig(null),
      });
      return;
    }
    setNewListTitle('');
    setIsListModalOpen(true);
  };

  const handleSaveList = async () => {
    if (!newListTitle.trim()) return;
    try {
      await createChecklist(newListTitle.trim());
      setIsListModalOpen(false);
      setNewListTitle('');
    } catch (e: any) {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: e.message || 'Failed to create list.',
        icon: 'alert-circle-outline',
        iconColor: colors.error || '#ef4444',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(null) }],
        onClose: () => setAlertConfig(null),
      });
    }
  };

  const handleDeleteListPrompt = (list: Checklist) => {
    setAlertConfig({
      visible: true,
      title: 'Delete List',
      message: `Delete "${list.title}" and its ${list.items?.length || 0} items?`,
      icon: 'trash-outline',
      iconColor: colors.error || '#ef4444',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => setAlertConfig(null) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setAlertConfig(null);
            await deleteChecklist(list.id);
          },
        },
      ],
      onClose: () => setAlertConfig(null),
    });
  };

  const handleAddItem = async (listId: string) => {
    const text = newItemTextByList[listId]?.trim();
    if (!text) return;

    const list = checklists.find((l) => l.id === listId);
    if (list && (list.items?.length || 0) >= MAX_ITEMS_PER_LIST) {
      setAlertConfig({
        visible: true,
        title: 'Item Limit Reached',
        message: `This list cannot have more than ${MAX_ITEMS_PER_LIST} items.`,
        icon: 'alert-circle-outline',
        iconColor: colors.warning || '#f59e0b',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(null) }],
        onClose: () => setAlertConfig(null),
      });
      return;
    }

    try {
      await addChecklistItem(listId, text);
      setNewItemTextByList((prev) => ({ ...prev, [listId]: '' }));
    } catch (e: any) {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: e.message || 'Failed to add item.',
        icon: 'alert-circle-outline',
        iconColor: colors.error || '#ef4444',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(null) }],
        onClose: () => setAlertConfig(null),
      });
    }
  };

  // ── Sticky Note Handlers ───────────────────────────────────────────────────

  const handleOpenCreateNote = () => {
    if (stickyNotes.length >= MAX_STICKY_NOTES) {
      setAlertConfig({
        visible: true,
        title: 'Note Limit Reached',
        message: `You cannot create more than ${MAX_STICKY_NOTES} sticky notes. Remove one to add another.`,
        icon: 'alert-circle-outline',
        iconColor: colors.warning || '#f59e0b',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(null) }],
        onClose: () => setAlertConfig(null),
      });
      return;
    }
    setEditingNoteId(null);
    setNoteContent('');
    setSelectedColor('yellow');
    setIsNoteModalOpen(true);
  };

  const handleOpenEditNote = (note: StickyNote) => {
    setEditingNoteId(note.id);
    setNoteContent(note.content);
    setSelectedColor(note.color);
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = async () => {
    if (!noteContent.trim()) return;
    try {
      if (editingNoteId) {
        await updateStickyNote(editingNoteId, noteContent.trim(), selectedColor);
      } else {
        await createStickyNote(noteContent.trim(), selectedColor);
      }
      setIsNoteModalOpen(false);
      setEditingNoteId(null);
      setNoteContent('');
    } catch (e: any) {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: e.message || 'Failed to save note.',
        icon: 'alert-circle-outline',
        iconColor: colors.error || '#ef4444',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(null) }],
        onClose: () => setAlertConfig(null),
      });
    }
  };

  const handleDeleteNotePrompt = (noteId: string) => {
    setAlertConfig({
      visible: true,
      title: 'Delete Sticky Note',
      message: 'Are you sure you want to delete this note?',
      icon: 'trash-outline',
      iconColor: colors.error || '#ef4444',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => setAlertConfig(null) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setAlertConfig(null);
            await deleteStickyNote(noteId);
          },
        },
      ],
      onClose: () => setAlertConfig(null),
    });
  };

  const s = makeStyles(colors, isDark);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Lists & Notes" />

      {/* ── Segmented Control Bar ────────────────────────────────────────── */}
      <View style={s.tabBarContainer}>
        <View style={s.segmentedControl}>
          <TouchableOpacity
            style={[s.segmentButton, activeTab === 'lists' && s.segmentButtonActive]}
            onPress={() => setActiveTab('lists')}
            activeOpacity={0.7}
          >
            <AppIcon
              name="list-outline"
              size={18}
              color={activeTab === 'lists' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                s.segmentButtonText,
                activeTab === 'lists' && s.segmentButtonTextActive,
              ]}
            >
              Lists ({checklists.length}/{MAX_LISTS})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.segmentButton, activeTab === 'notes' && s.segmentButtonActive]}
            onPress={() => setActiveTab('notes')}
            activeOpacity={0.7}
          >
            <AppIcon
              name="document-text-outline"
              size={18}
              color={activeTab === 'notes' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                s.segmentButtonText,
                activeTab === 'notes' && s.segmentButtonTextActive,
              ]}
            >
              Sticky Notes ({stickyNotes.length}/{MAX_STICKY_NOTES})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Main Content View ────────────────────────────────────────────── */}
      <ScrollView
        style={s.contentScrollView}
        contentContainerStyle={s.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'lists' ? (
          // ── CHECKLISTS VIEW ──────────────────────────────────────────────
          <View style={s.tabSection}>
            <View style={s.sectionHeader}>
              <View>
                <Text style={s.sectionTitle}>Checklists</Text>
                <Text style={s.sectionSubtitle}>
                  Simple lists for shopping, workouts & tasks (max {MAX_LISTS})
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  s.addButton,
                  checklists.length >= MAX_LISTS && s.addButtonDisabled,
                ]}
                onPress={handleOpenCreateList}
                disabled={checklists.length >= MAX_LISTS}
              >
                <AppIcon name="add" size={18} color="#FFFFFF" />
                <Text style={s.addButtonText}>New List</Text>
              </TouchableOpacity>
            </View>

            {checklists.length === 0 ? (
              <View style={s.emptyBox}>
                <AppIcon name="checkbox-outline" size={48} color={colors.textTertiary} />
                <Text style={s.emptyTitle}>No checklists yet</Text>
                <Text style={s.emptySubtitle}>
                  Create your first list for shopping, gym workouts, or tasks.
                </Text>
                <TouchableOpacity style={s.emptyCreateBtn} onPress={handleOpenCreateList}>
                  <Text style={s.emptyCreateBtnText}>+ Create List</Text>
                </TouchableOpacity>
              </View>
            ) : (
              checklists.map((list) => {
                const totalItems = list.items?.length || 0;
                const completedItems = list.items?.filter((it) => it.isCompleted).length || 0;
                const progressPct = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
                const currentText = newItemTextByList[list.id] || '';

                return (
                  <View key={list.id} style={s.listCard}>
                    {/* List Header */}
                    <View style={s.listCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.listTitle}>{list.title}</Text>
                        <Text style={s.listMeta}>
                          {completedItems} of {totalItems} completed ({totalItems}/{MAX_ITEMS_PER_LIST} items)
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={s.deleteListBtn}
                        onPress={() => handleDeleteListPrompt(list)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <AppIcon name="trash-outline" size={18} color={colors.error || '#ef4444'} />
                      </TouchableOpacity>
                    </View>

                    {/* Progress Bar */}
                    {totalItems > 0 && (
                      <View style={s.progressBarTrack}>
                        <View style={[s.progressBarFill, { width: `${progressPct}%` }]} />
                      </View>
                    )}

                    {/* Items List */}
                    <View style={s.itemsContainer}>
                      {list.items?.map((item) => (
                        <View key={item.id} style={s.itemRow}>
                          <TouchableOpacity
                            style={s.checkboxTouchable}
                            onPress={() => toggleChecklistItem(list.id, item.id, !item.isCompleted)}
                          >
                            <AppIcon
                              name={item.isCompleted ? 'checkbox' : 'square-outline'}
                              size={20}
                              color={item.isCompleted ? colors.primary : colors.textSecondary}
                            />
                            <Text
                              style={[
                                s.itemText,
                                item.isCompleted && s.itemTextCompleted,
                              ]}
                            >
                              {item.text}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => deleteChecklistItem(list.id, item.id)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <AppIcon name="close" size={16} color={colors.textTertiary} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>

                    {/* Inline Add Item Input */}
                    {totalItems < MAX_ITEMS_PER_LIST ? (
                      <View style={s.addItemRow}>
                        <TextInput
                          style={s.addItemInput}
                          placeholder="Add item..."
                          placeholderTextColor={colors.textTertiary}
                          value={currentText}
                          onChangeText={(val) =>
                            setNewItemTextByList((prev) => ({ ...prev, [list.id]: val }))
                          }
                          onSubmitEditing={() => handleAddItem(list.id)}
                          returnKeyType="done"
                        />
                        <TouchableOpacity
                          style={[s.addItemSubmitBtn, !currentText.trim() && s.addItemSubmitBtnDisabled]}
                          onPress={() => handleAddItem(list.id)}
                          disabled={!currentText.trim()}
                        >
                          <AppIcon name="add" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={s.itemLimitNotice}>
                        List capacity full ({MAX_ITEMS_PER_LIST}/{MAX_ITEMS_PER_LIST} items)
                      </Text>
                    )}
                  </View>
                );
              })
            )}
          </View>
        ) : (
          // ── STICKY NOTES VIEW ────────────────────────────────────────────
          <View style={s.tabSection}>
            <View style={s.sectionHeader}>
              <View>
                <Text style={s.sectionTitle}>Sticky Notes</Text>
                <Text style={s.sectionSubtitle}>
                  Quick notes up to {MAX_NOTE_CHARACTERS} chars (max {MAX_STICKY_NOTES})
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  s.addButton,
                  stickyNotes.length >= MAX_STICKY_NOTES && s.addButtonDisabled,
                ]}
                onPress={handleOpenCreateNote}
                disabled={stickyNotes.length >= MAX_STICKY_NOTES}
              >
                <AppIcon name="add" size={18} color="#FFFFFF" />
                <Text style={s.addButtonText}>New Note</Text>
              </TouchableOpacity>
            </View>

            {stickyNotes.length === 0 ? (
              <View style={s.emptyBox}>
                <AppIcon name="document-text-outline" size={48} color={colors.textTertiary} />
                <Text style={s.emptyTitle}>No sticky notes yet</Text>
                <Text style={s.emptySubtitle}>
                  Pin a quick reminder or note with customizable colors.
                </Text>
                <TouchableOpacity style={s.emptyCreateBtn} onPress={handleOpenCreateNote}>
                  <Text style={s.emptyCreateBtnText}>+ Pin Note</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.stickyGrid}>
                {stickyNotes.map((note) => {
                  const colorOption =
                    STICKY_COLORS.find((c) => c.id === note.color) || STICKY_COLORS[0];
                  const cardBg = isDark ? colorOption.bgDark : colorOption.bgLight;
                  const cardBorder = isDark ? colorOption.borderDark : colorOption.borderLight;
                  const cardText = isDark ? colorOption.textDark : colorOption.textLight;

                  return (
                    <View
                      key={note.id}
                      style={[
                        s.stickyCard,
                        {
                          backgroundColor: cardBg,
                          borderColor: cardBorder,
                        },
                      ]}
                    >
                      {/* Top Pin Header */}
                      <View style={s.stickyCardTop}>
                        <AppIcon name="bookmark" size={14} color={cardBorder} />
                        <View style={s.stickyActionsRow}>
                          <TouchableOpacity
                            onPress={() => handleOpenEditNote(note)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <AppIcon name="pencil" size={13} color={cardText} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteNotePrompt(note.id)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            style={{ marginLeft: 8 }}
                          >
                            <AppIcon name="trash-outline" size={13} color={cardText} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Content */}
                      <Text style={[s.stickyContent, { color: cardText }]}>
                        {note.content}
                      </Text>

                      {/* Footer: Character Count */}
                      <View style={s.stickyFooter}>
                        <Text style={[s.stickyCharCount, { color: cardText, opacity: 0.7 }]}>
                          {note.content.length}/{MAX_NOTE_CHARACTERS}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── CREATE LIST MODAL ──────────────────────────────────────────────── */}
      <Modal
        visible={isListModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsListModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.modalOverlay}
        >
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>New Checklist</Text>
            <Text style={s.modalSubtitle}>Give your list a name (e.g. Shopping, Gym)</Text>
            <TextInput
              style={s.modalInput}
              placeholder="e.g. Weekly Groceries"
              placeholderTextColor={colors.textTertiary}
              value={newListTitle}
              onChangeText={setNewListTitle}
              autoFocus
              maxLength={40}
            />
            <View style={s.modalButtonRow}>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnCancel]}
                onPress={() => setIsListModalOpen(false)}
              >
                <Text style={s.modalBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnPrimary, !newListTitle.trim() && s.modalBtnDisabled]}
                onPress={handleSaveList}
                disabled={!newListTitle.trim()}
              >
                <Text style={s.modalBtnTextPrimary}>Create List</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── CREATE / EDIT STICKY NOTE MODAL ─────────────────────────────────── */}
      <Modal
        visible={isNoteModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNoteModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.modalOverlay}
        >
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>
              {editingNoteId ? 'Edit Sticky Note' : 'New Sticky Note'}
            </Text>
            <Text style={s.modalSubtitle}>
              Keep it short and sweet (max {MAX_NOTE_CHARACTERS} characters)
            </Text>

            {/* Content Input */}
            <TextInput
              style={[s.modalInput, s.modalInputMultiline]}
              placeholder="Write your note here..."
              placeholderTextColor={colors.textTertiary}
              value={noteContent}
              onChangeText={setNoteContent}
              maxLength={MAX_NOTE_CHARACTERS}
              multiline
              autoFocus
            />

            {/* Character Counter */}
            <View style={s.charCountRow}>
              <Text
                style={[
                  s.charCountText,
                  noteContent.length >= MAX_NOTE_CHARACTERS && s.charCountTextMax,
                ]}
              >
                {noteContent.length} / {MAX_NOTE_CHARACTERS} characters
              </Text>
            </View>

            {/* Color Palette Selector */}
            <Text style={s.colorLabel}>Select Note Color</Text>
            <View style={s.colorPaletteRow}>
              {STICKY_COLORS.map((c) => {
                const isSelected = selectedColor === c.id;
                const dotColor = isDark ? c.borderDark : c.borderLight;
                const dotBg = isDark ? c.bgDark : c.bgLight;

                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      s.colorChip,
                      { backgroundColor: dotBg, borderColor: dotColor },
                      isSelected && s.colorChipSelected,
                    ]}
                    onPress={() => setSelectedColor(c.id)}
                  >
                    {isSelected && (
                      <AppIcon
                        name="checkmark"
                        size={16}
                        color={isDark ? c.textDark : c.textLight}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Action Buttons */}
            <View style={s.modalButtonRow}>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnCancel]}
                onPress={() => setIsNoteModalOpen(false)}
              >
                <Text style={s.modalBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnPrimary, !noteContent.trim() && s.modalBtnDisabled]}
                onPress={handleSaveNote}
                disabled={!noteContent.trim()}
              >
                <Text style={s.modalBtnTextPrimary}>
                  {editingNoteId ? 'Save Changes' : 'Pin Note'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── THEMED ALERT DIALOG ────────────────────────────────────────────── */}
      {alertConfig && <ThemedAlert {...alertConfig} />}
    </SafeAreaView>
  );
}

function makeStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    tabBarContainer: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#27272A' : '#F4F4F5',
      borderRadius: 10,
      padding: 3,
    },
    segmentButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      gap: 6,
      borderRadius: 8,
    },
    segmentButtonActive: {
      backgroundColor: colors.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    segmentButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    segmentButtonTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    contentScrollView: {
      flex: 1,
    },
    contentContainer: {
      padding: 16,
      paddingBottom: 40,
    },
    tabSection: {
      width: '100%',
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    sectionSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 4,
    },
    addButtonDisabled: {
      opacity: 0.5,
    },
    addButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    emptyBox: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginVertical: 12,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginTop: 12,
    },
    emptySubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 16,
    },
    emptyCreateBtn: {
      backgroundColor: colors.primary + '18',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    emptyCreateBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    // Checklist Card Styles
    listCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    listCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    listTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    listMeta: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    deleteListBtn: {
      padding: 4,
    },
    progressBarTrack: {
      height: 4,
      backgroundColor: isDark ? '#3F3F46' : '#E4E4E7',
      borderRadius: 2,
      marginVertical: 12,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 2,
    },
    itemsContainer: {
      marginVertical: 4,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border + '50',
    },
    checkboxTouchable: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 10,
    },
    itemText: {
      fontSize: 14,
      color: colors.text,
      flex: 1,
    },
    itemTextCompleted: {
      textDecorationLine: 'line-through',
      color: colors.textTertiary,
    },
    addItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
      gap: 8,
    },
    addItemInput: {
      flex: 1,
      backgroundColor: isDark ? '#27272A' : '#F4F4F5',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 13,
      color: colors.text,
    },
    addItemSubmitBtn: {
      backgroundColor: colors.primary,
      width: 34,
      height: 34,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addItemSubmitBtnDisabled: {
      opacity: 0.4,
    },
    itemLimitNotice: {
      fontSize: 12,
      color: colors.textTertiary,
      fontStyle: 'italic',
      marginTop: 8,
      textAlign: 'center',
    },
    // Sticky Notes Grid Styles
    stickyGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    stickyCard: {
      width: '48%',
      minHeight: 140,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      justifyContent: 'space-between',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    stickyCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    stickyActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    stickyContent: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
      flex: 1,
    },
    stickyFooter: {
      marginTop: 8,
      alignItems: 'flex-end',
    },
    stickyCharCount: {
      fontSize: 10,
      fontWeight: '600',
    },
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 6,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    modalSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
      marginBottom: 16,
    },
    modalInput: {
      backgroundColor: isDark ? '#27272A' : '#F4F4F5',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalInputMultiline: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    charCountRow: {
      alignItems: 'flex-end',
      marginTop: 6,
    },
    charCountText: {
      fontSize: 11,
      color: colors.textTertiary,
    },
    charCountTextMax: {
      color: colors.error || '#ef4444',
      fontWeight: '700',
    },
    colorLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      marginTop: 14,
      marginBottom: 8,
    },
    colorPaletteRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 18,
    },
    colorChip: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorChipSelected: {
      transform: [{ scale: 1.15 }],
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
    },
    modalButtonRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 10,
    },
    modalBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalBtnCancel: {
      backgroundColor: isDark ? '#27272A' : '#F4F4F5',
    },
    modalBtnPrimary: {
      backgroundColor: colors.primary,
    },
    modalBtnDisabled: {
      opacity: 0.5,
    },
    modalBtnTextCancel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    modalBtnTextPrimary: {
      fontSize: 13,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
}
