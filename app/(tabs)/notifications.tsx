"use client"

import { useState, useEffect } from "react"
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet, Platform, Alert } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Ionicons } from "@expo/vector-icons"

interface Notification {
  id: string
  type: "meal" | "insulin" | "activity"
  title: string
  message: string
  time: string
  isRead: boolean
  isDone: boolean
  scheduledTime: Date
}

const STORAGE_KEY = "@notifications"

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [filter, setFilter] = useState<"all" | "meal" | "insulin" | "activity">("all")
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    loadNotifications()

    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)
      checkReminders(now)
    }, 60000) // check every minute

    return () => clearInterval(timer)
  }, [])

  const getPhilippinesTime = () => {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }))
  }

  const generateDailyNotifications = (): Notification[] => {
    const today = new Date()
    const schedules = [
      { hour: 6, minute: 0, type: "meal" as const, title: "Breakfast Time", message: "Time for your morning meal" },
      { hour: 7, minute: 0, type: "insulin" as const, title: "Morning Insulin", message: "Take your morning insulin dose" },
      { hour: 8, minute: 0, type: "activity" as const, title: "Morning Walk", message: "Time for your morning exercise" },
      { hour: 12, minute: 0, type: "meal" as const, title: "Lunch Time", message: "Time for your afternoon meal" },
      { hour: 16, minute: 0, type: "activity" as const, title: "Afternoon Activity", message: "Time for your afternoon exercise" },
      { hour: 18, minute: 0, type: "meal" as const, title: "Dinner Time", message: "Time for your evening meal" },
      { hour: 19, minute: 0, type: "insulin" as const, title: "Evening Insulin", message: "Take your evening insulin dose" },
    ]

    return schedules.map((s, index) => {
      const scheduledTime = new Date(today)
      scheduledTime.setHours(s.hour, s.minute, 0, 0)
      return {
        id: `notif-${index}`,
        type: s.type,
        title: s.title,
        message: s.message,
        time: scheduledTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        isRead: false,
        isDone: false,
        scheduledTime,
      }
    })
  }

  const loadNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const withDates = parsed.map((n: any) => ({
          ...n,
          scheduledTime: new Date(n.scheduledTime),
        }))
        setNotifications(withDates)
      } else {
        const initial = generateDailyNotifications()
        setNotifications(initial)
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
      }
    } catch (error) {
      console.error("Error loading notifications:", error)
    }
  }

  const saveNotifications = async (updated: Notification[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setNotifications(updated)
  }

  // 🔔 In-App Reminder Checker
  const checkReminders = (now: Date) => {
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()

    notifications.forEach((notif) => {
      const notifTime = new Date(notif.scheduledTime)
      if (
        notifTime.getHours() === currentHour &&
        notifTime.getMinutes() === currentMinute &&
        !notif.isDone
      ) {
        Alert.alert("Reminder", `${notif.title}\n\n${notif.message}`)
      }
    })
  }

  const handleNotificationPress = (id: string) => {
    const notification = notifications.find((n) => n.id === id)
    if (notification) {
      const updated = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      saveNotifications(updated)
      setSelectedNotification({ ...notification, isRead: true })
      setModalVisible(true)
    }
  }

  const markAsDone = () => {
    if (selectedNotification) {
      const updated = notifications.map((n) =>
        n.id === selectedNotification.id ? { ...n, isDone: true, isRead: true } : n,
      )
      saveNotifications(updated)
      setModalVisible(false)
    }
  }

  const snoozeNotification = () => {
    if (selectedNotification) {
      Alert.alert("Snoozed", "You will be reminded again in 15 minutes.")
      setTimeout(() => {
        Alert.alert("Reminder", `${selectedNotification.title}\n\n${selectedNotification.message}`)
      }, 15 * 60 * 1000)
      setModalVisible(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "meal": return "restaurant"
      case "insulin": return "medical"
      case "activity": return "fitness"
      default: return "notifications"
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "meal": return "#10b981"
      case "insulin": return "#3b82f6"
      case "activity": return "#f59e0b"
      default: return "#6b7280"
    }
  }

  const isCurrentNotification = (scheduledTime: Date) => {
    const now = getPhilippinesTime()
    const notifTime = new Date(scheduledTime)
    notifTime.setFullYear(now.getFullYear(), now.getMonth(), now.getDate())

    const diff = notifTime.getTime() - now.getTime()
    const minutesDiff = diff / (1000 * 60)
    return minutesDiff >= -15 && minutesDiff <= 15
  }

  const getNotificationStatus = (notification: Notification) => {
    if (notification.isDone) return "completed"
    if (isCurrentNotification(notification.scheduledTime)) return "current"

    const now = getPhilippinesTime()
    const notifTime = new Date(notification.scheduledTime)
    notifTime.setFullYear(now.getFullYear(), now.getMonth(), now.getDate())

    if (notifTime < now) return "missed"
    return "upcoming"
  }

  const filteredNotifications = notifications.filter((n) => (filter === "all" ? true : n.type === filter))

  const unreadCount = notifications.filter((n) => !n.isRead && !n.isDone).length

  // UI same as before
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="notifications" size={28} color="#1f2937" />
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <Text style={styles.currentTimeText}>
          {getPhilippinesTime().toLocaleString("en-US", {
            timeZone: "Asia/Manila",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}{" "}
          - Philippines Time
        </Text>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {["all", "meal", "insulin", "activity"].map((filterType) => (
            <TouchableOpacity
              key={filterType}
              style={[styles.filterTab, filter === filterType && styles.filterTabActive]}
              onPress={() => setFilter(filterType as any)}
            >
              <Text style={[styles.filterTabText, filter === filterType && styles.filterTabTextActive]}>
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView}>
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateTitle}>No notifications right now</Text>
            <Text style={styles.emptyStateMessage}>Notifications will appear based on their scheduled time</Text>
          </View>
        ) : (
          filteredNotifications.map((notification) => {
            const status = getNotificationStatus(notification)
            const color = getNotificationColor(notification.type)

            return (
              <TouchableOpacity
                key={notification.id}
                style={[styles.notificationCard, !notification.isRead && styles.notificationCardUnread]}
                onPress={() => handleNotificationPress(notification.id)}
              >
                <View style={[styles.notificationBorder, { backgroundColor: color }]} />
                <View style={styles.notificationIcon}>
                  <Ionicons name={getNotificationIcon(notification.type) as any} size={24} color={color} />
                </View>
                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    {status === "current" && (
                      <View style={styles.nowBadge}>
                        <Text style={styles.nowBadgeText}>NOW</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.notificationMessage}>{notification.message}</Text>
                  <View style={styles.notificationFooter}>
                    <Text style={styles.notificationTime}>{notification.time}</Text>
                    {status === "completed" && (
                      <View style={styles.statusBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                        <Text style={styles.statusText}>Done</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )
          })
        )}
      </ScrollView>

      {/* Modal */}
      <Modal animationType="slide" transparent visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedNotification && (
              <>
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.modalIconContainer,
                      { backgroundColor: getNotificationColor(selectedNotification.type) + "20" },
                    ]}
                  >
                    <Ionicons
                      name={getNotificationIcon(selectedNotification.type) as any}
                      size={32}
                      color={getNotificationColor(selectedNotification.type)}
                    />
                  </View>
                  <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalTitle}>{selectedNotification.title}</Text>
                <Text style={styles.modalMessage}>{selectedNotification.message}</Text>
                <Text style={styles.modalTime}>Scheduled for {selectedNotification.time}</Text>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={markAsDone}>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.primaryButtonText}>Mark as Done</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={snoozeNotification}>
                    <Ionicons name="time" size={20} color="#3b82f6" />
                    <Text style={styles.secondaryButtonText}>Snooze 15 min</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
    marginLeft: 12,
  },
  currentTimeText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    marginLeft: 40,
  },
  badge: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  filterContainer: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: "#f3f4f6",
  },
  filterTabActive: {
    backgroundColor: "#3b82f6",
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  filterTabTextActive: {
    color: "#fff",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4b5563",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  notificationCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationCardUnread: {
    backgroundColor: "#f0f9ff",
  },
  notificationBorder: {
    width: 4,
  },
  notificationIcon: {
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationContent: {
    flex: 1,
    padding: 16,
    paddingLeft: 0,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
  },
  nowBadge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  nowBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  notificationMessage: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notificationTime: {
    fontSize: 12,
    color: "#9ca3af",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10b981",
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 8,
    lineHeight: 24,
  },
  modalTime: {
    fontSize: 14,
    color: "#9ca3af",
    marginBottom: 24,
  },
  modalActions: {
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#3b82f6",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#eff6ff",
  },
  secondaryButtonText: {
    color: "#3b82f6",
    fontSize: 16,
    fontWeight: "600",
  },
})
