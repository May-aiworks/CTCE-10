import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { CalendarEvent, CreateEventRequest } from '../types';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CreateEventRequest) => Promise<void>;
  event?: CalendarEvent | null;
  title?: string;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  event,
  title: initialTitle,
}) => {
  const [formData, setFormData] = useState<CreateEventRequest>({
    title: '',
    description: '',
    start_datetime: '',
    end_datetime: '',
    location: '',
    is_all_day: false,
    calendar_id: 'primary',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (event) {
        console.log('📅 EventModal: Setting form data for event:', event);

        // Defensive programming for datetime fields
        const startDateTime = event.start_datetime;
        const endDateTime = event.end_datetime;

        if (!startDateTime) {
          console.warn('⚠️ Event missing start_datetime:', event);
        }
        if (!endDateTime) {
          console.warn('⚠️ Event missing end_datetime:', event);
        }

        setFormData({
          title: event.title || '',
          description: event.description || '',
          start_datetime: startDateTime ? startDateTime.slice(0, 16) : '',
          end_datetime: endDateTime ? endDateTime.slice(0, 16) : '',
          location: event.location || '',
          is_all_day: event.is_all_day || false,
          calendar_id: event.calendar_id || 'primary',
        });
      } else {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        
        setFormData({
          title: initialTitle || '',
          description: '',
          start_datetime: now.toISOString().slice(0, 16),
          end_datetime: oneHourLater.toISOString().slice(0, 16),
          location: '',
          is_all_day: false,
          calendar_id: 'primary',
        });
      }
      setError(null);
    }
  }, [isOpen, event, initialTitle]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (new Date(formData.start_datetime) >= new Date(formData.end_datetime)) {
      setError('End time must be after start time');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const eventData = {
        ...formData,
        start_datetime: new Date(formData.start_datetime).toISOString(),
        end_datetime: new Date(formData.end_datetime).toISOString(),
      };
      
      await onSave(eventData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Calendar size={20} />
            {event ? 'Edit Event' : 'Create Event'}
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              placeholder="Event title"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              placeholder="Event description"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_datetime">Start Time *</label>
              <input
                type="datetime-local"
                id="start_datetime"
                name="start_datetime"
                value={formData.start_datetime}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="end_datetime">End Time *</label>
              <input
                type="datetime-local"
                id="end_datetime"
                name="end_datetime"
                value={formData.end_datetime}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="Event location"
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="is_all_day"
                checked={formData.is_all_day}
                onChange={handleInputChange}
              />
              All-day event
            </label>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};