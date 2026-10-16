import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal.js';
import { api } from '../../api/client.js';
import { OrganizationMember } from '../../types/index.js';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customerId: string;
  customerType?: string;
  initialData?: OrganizationMember | null;
}

export const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customerId,
  customerType = 'ORGANIZATION',
  initialData,
}) => {
  const isSchool = customerType === 'SCHOOL' || customerType === 'INSTITUTE';

  const [memberId, setMemberId] = useState(initialData?.memberId || '');
  const [name, setName] = useState(initialData?.name || '');
  const [roleCategory, setRoleCategory] = useState(
    initialData?.roleCategory || (isSchool ? 'STUDENT' : 'EMPLOYEE')
  );
  const [designation, setDesignation] = useState(initialData?.designation || '');
  const [department, setDepartment] = useState(initialData?.department || '');
  const [section, setSection] = useState(initialData?.section || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [gender, setGender] = useState(initialData?.gender || '');
  const [age, setAge] = useState<string>(initialData?.age ? String(initialData.age) : '');
  const [bloodGroup, setBloodGroup] = useState(initialData?.bloodGroup || '');
  const [emergencyContactName, setEmergencyContactName] = useState(
    initialData?.emergencyContactName || ''
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    initialData?.emergencyContactPhone || ''
  );
  const [emergencyContactRelation, setEmergencyContactRelation] = useState(
    initialData?.emergencyContactRelation || ''
  );
  const [dietaryPreferences, setDietaryPreferences] = useState(
    initialData?.dietaryPreferences || ''
  );
  const [medicalNotes, setMedicalNotes] = useState(initialData?.medicalNotes || '');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>(initialData?.status || 'ACTIVE');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        memberId: memberId.trim() || null,
        name: name.trim(),
        roleCategory,
        designation: designation.trim() || null,
        department: department.trim() || null,
        section: section.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        gender: gender || null,
        age: age ? Number(age) : null,
        bloodGroup: bloodGroup.trim() || null,
        emergencyContactName: emergencyContactName.trim() || null,
        emergencyContactPhone: emergencyContactPhone.trim() || null,
        emergencyContactRelation: emergencyContactRelation.trim() || null,
        dietaryPreferences: dietaryPreferences.trim() || null,
        medicalNotes: medicalNotes.trim() || null,
        status,
      };

      if (initialData?.id) {
        await api.put(`/customers/${customerId}/members/${initialData.id}`, payload);
      } else {
        await api.post(`/customers/${customerId}/members`, payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Directory Member' : 'Add New Member'}
      subtitle={
        isSchool
          ? 'Add Student, Teacher, Staff or Faculty details'
          : 'Add Corporate Employee, Executive or Group Member'
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              {isSchool ? 'Roll No / Student ID' : 'Employee / Member ID'}
            </label>
            <input
              type="text"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              placeholder={isSchool ? 'e.g. ST-0482' : 'e.g. EMP-109'}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-brand-500 font-mono"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Role Category</label>
            <select
              value={roleCategory}
              onChange={(e) => setRoleCategory(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
            >
              {isSchool ? (
                <>
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Teacher / Faculty</option>
                  <option value="STAFF">Staff / Administrator</option>
                  <option value="COORDINATOR">Tour Coordinator</option>
                </>
              ) : (
                <>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="EXECUTIVE">Executive / Manager</option>
                  <option value="MEMBER">Member</option>
                  <option value="COORDINATOR">Trip Coordinator</option>
                </>
              )}
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              {isSchool ? 'Class / Grade' : 'Department'}
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder={isSchool ? 'e.g. Grade 10 / Science' : 'e.g. Engineering / HR'}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              {isSchool ? 'Section / Division' : 'Designation'}
            </label>
            <input
              type="text"
              value={isSchool ? section : designation}
              onChange={(e) => (isSchool ? setSection(e.target.value) : setDesignation(e.target.value))}
              placeholder={isSchool ? 'e.g. Section B' : 'e.g. Senior Consultant'}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. rahul@company.com"
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
            />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
              >
                <option value="">-</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Age"
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Blood</label>
              <input
                type="text"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                placeholder="O+"
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Emergency & Dietary */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Emergency & Operational Preferences</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Emergency Contact Name</label>
              <input
                type="text"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                placeholder="e.g. Anita Sharma"
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Emergency Phone</label>
              <input
                type="tel"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                placeholder="e.g. 9876543211"
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Relation</label>
              <input
                type="text"
                value={emergencyContactRelation}
                onChange={(e) => setEmergencyContactRelation(e.target.value)}
                placeholder="e.g. Parent / Spouse"
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Dietary Preferences</label>
              <input
                type="text"
                value={dietaryPreferences}
                onChange={(e) => setDietaryPreferences(e.target.value)}
                placeholder="e.g. Vegetarian, Jain, Vegan, Halal"
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Medical Notes / Allergies</label>
              <input
                type="text"
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                placeholder="e.g. Asthmatic, Penicillin allergy"
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : initialData ? 'Update Member' : 'Add Member'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
