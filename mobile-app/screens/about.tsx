import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function InfoScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ℹ️ App Information</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 Task Tracker App</Text>
        <Text style={styles.sectionText}>
          A simple and intuitive mobile application for tracking and managing your
          tasks and activities.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Features</Text>
        <View style={styles.featureItem}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.featureText}>
            <Text style={styles.bold}>Create Tasks:</Text> Add new tracks with title,
            description, priority, and status
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.featureText}>
            <Text style={styles.bold}>Edit Tasks:</Text> Update existing tracks at any
            time
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.featureText}>
            <Text style={styles.bold}>Delete Tasks:</Text> Remove completed or
            unnecessary tracks
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.featureText}>
            <Text style={styles.bold}>Search:</Text> Find tracks by title, description,
            or tags
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.featureText}>
            <Text style={styles.bold}>View Details:</Text> See full information about
            each track
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.featureText}>
            <Text style={styles.bold}>Organize with Tags:</Text> Categorize tracks using
            custom tags
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎨 Status Types</Text>
        <View style={styles.statusItem}>
          <View style={[styles.statusBadge, { backgroundColor: '#9E9E9E' }]} />
          <Text style={styles.statusText}>
            <Text style={styles.bold}>Pending:</Text> Task not started yet
          </Text>
        </View>
        <View style={styles.statusItem}>
          <View style={[styles.statusBadge, { backgroundColor: '#FF9800' }]} />
          <Text style={styles.statusText}>
            <Text style={styles.bold}>In Progress:</Text> Currently working on it
          </Text>
        </View>
        <View style={styles.statusItem}>
          <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.statusText}>
            <Text style={styles.bold}>Completed:</Text> Task finished
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚦 Priority Levels</Text>
        <View style={styles.statusItem}>
          <View style={[styles.statusBadge, { backgroundColor: '#2196F3' }]} />
          <Text style={styles.statusText}>
            <Text style={styles.bold}>Low:</Text> Can wait, not urgent
          </Text>
        </View>
        <View style={styles.statusItem}>
          <View style={[styles.statusBadge, { backgroundColor: '#FF9800' }]} />
          <Text style={styles.statusText}>
            <Text style={styles.bold}>Medium:</Text> Normal priority
          </Text>
        </View>
        <View style={styles.statusItem}>
          <View style={[styles.statusBadge, { backgroundColor: '#F44336' }]} />
          <Text style={styles.statusText}>
            <Text style={styles.bold}>High:</Text> Urgent, needs attention
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💡 How to Use</Text>
        <View style={styles.step}>
          <Text style={styles.stepNumber}>1</Text>
          <Text style={styles.stepText}>
            Tap the <Text style={styles.bold}>+ button</Text> on the home screen to
            create a new track
          </Text>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepNumber}>2</Text>
          <Text style={styles.stepText}>
            Fill in the track details (title, description, status, priority, and tags)
          </Text>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepNumber}>3</Text>
          <Text style={styles.stepText}>
            Tap <Text style={styles.bold}>Create</Text> to save the track
          </Text>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepNumber}>4</Text>
          <Text style={styles.stepText}>
            Use the search bar to quickly find specific tracks
          </Text>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepNumber}>5</Text>
          <Text style={styles.stepText}>
            Tap any track to view details, edit, or delete it
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Release Notes</Text>
        <View style={styles.releaseItem}>
          <Text style={styles.releaseVersion}>v1.0.0 - Initial Release</Text>
          <Text style={styles.releaseDate}>December 2025</Text>
          <Text style={styles.releaseNote}>• Basic task tracking functionality</Text>
          <Text style={styles.releaseNote}>• Create, read, update, delete operations</Text>
          <Text style={styles.releaseNote}>• Search and filter capabilities</Text>
          <Text style={styles.releaseNote}>• Tag-based organization</Text>
          <Text style={styles.releaseNote}>• Status and priority management</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👨‍💻 Development</Text>
        <Text style={styles.sectionText}>
          Built with React Native and Expo for cross-platform compatibility.
        </Text>
        <Text style={styles.techStack}>
          <Text style={styles.bold}>Tech Stack:</Text> React Native, TypeScript, Expo,
          React Navigation
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with ❤️</Text>
        <Text style={styles.footerText}>© 2025 Task Tracker</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#ffffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 18,
    color: '#2196F3',
    marginRight: 8,
  },
  featureText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    flex: 1,
  },
  bold: {
    fontWeight: 'bold',
    color: '#333',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  statusText: {
    fontSize: 15,
    color: '#666',
    flex: 1,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2196F3',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: 'bold',
    marginRight: 12,
  },
  stepText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    flex: 1,
  },
  releaseItem: {
    marginBottom: 16,
  },
  releaseVersion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  releaseDate: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
  },
  releaseNote: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginBottom: 4,
  },
  techStack: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
});
