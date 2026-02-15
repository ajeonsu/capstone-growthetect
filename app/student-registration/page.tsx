'use client';

import { useEffect, useState } from 'react';
import NutritionistSidebar from '@/components/NutritionistSidebar';

export default function StudentRegistrationPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('');
  const [gender, setGender] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [formError, setFormError] = useState('');
  const itemsPerPage = 15;

  useEffect(() => {
    loadStudents();
  }, [search, grade, gender]);

  const loadStudents = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (grade) params.append('grade', grade);
      if (gender) params.append('gender', gender);

      const response = await fetch(`/api/students?${params}`, {
        credentials: 'include', // Include cookies for authentication
      });
      const data = await response.json();

      if (data.success) {
        setStudents(data.students);
        setCurrentPage(1);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading students:', error);
      setLoading(false);
    }
  };

  const calculateAge = (birthdate: string) => {
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const formData = new FormData(e.target as HTMLFormElement);
    const method = editingStudent ? 'PUT' : 'POST';
    const url = '/api/students';

    try {
      let response;
      if (method === 'PUT') {
        const body: any = {};
        formData.forEach((value, key) => {
          body[key] = value;
        });
        body.id = editingStudent.id;
        response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Include cookies for authentication
          body: JSON.stringify(body),
        });
      } else {
        response = await fetch(url, {
          method: 'POST',
          credentials: 'include', // Include cookies for authentication
          body: formData,
        });
      }

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        setShowModal(false);
        setEditingStudent(null);
        loadStudents();
      } else {
        setFormError(data.message);
      }
    } catch (error) {
      setFormError('An error occurred. Please try again.');
    }
  };

  const deleteStudent = async (id: number) => {
    if (!confirm('Are you sure you want to delete this student?')) return;

    try {
      const response = await fetch(`/api/students?id=${id}`, {
        method: 'DELETE',
        credentials: 'include', // Include cookies for authentication
      });
      const data = await response.json();

      if (data.success) {
        alert(data.message);
        loadStudents();
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Error deleting student');
    }
  };

  const openAddModal = () => {
    setEditingStudent(null);
    setShowModal(true);
    setFormError('');
  };

  const openEditModal = (student: any) => {
    setEditingStudent(student);
    setShowModal(true);
    setFormError('');
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingStudent(null);
    setFormError('');
  };

  const paginatedStudents = students.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(students.length / itemsPerPage);
  const startRecord = students.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endRecord = Math.min(currentPage * itemsPerPage, students.length);

  return (
    <div className="bg-gray-100 min-h-screen">
      <NutritionistSidebar />
      <main className="md:ml-64 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Student Registration</h1>
            <button
              onClick={openAddModal}
              className="w-full sm:w-auto bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Student
            </button>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-gray-700 text-sm font-medium mb-2">Search Name or LRN</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    clearTimeout((window as any).searchTimeout);
                    (window as any).searchTimeout = setTimeout(() => setSearch(e.target.value), 500);
                  }}
                  placeholder="Search by name or LRN..."
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="block text-gray-700 text-sm font-medium mb-2">Grade Level</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All</option>
                  <option value="0">Kinder</option>
                  <option value="1">Grade 1</option>
                  <option value="2">Grade 2</option>
                  <option value="3">Grade 3</option>
                  <option value="4">Grade 4</option>
                  <option value="5">Grade 5</option>
                  <option value="6">Grade 6</option>
                </select>
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="block text-gray-700 text-sm font-medium mb-2">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
          </div>

          {/* Students Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-green-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">LRN</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Gender</th>
                    <th className="px-4 py-3 text-left">Age</th>
                    <th className="px-4 py-3 text-left">Grade</th>
                    <th className="px-4 py-3 text-left">Section</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Loading students...
                      </td>
                    </tr>
                  ) : paginatedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No students found
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{student.lrn}</td>
                        <td className="px-4 py-3">
                          {student.first_name} {student.middle_name || ''} {student.last_name}
                        </td>
                        <td className="px-4 py-3">{student.gender}</td>
                        <td className="px-4 py-3">{student.age || '-'}</td>
                        <td className="px-4 py-3">Grade {student.grade_level}</td>
                        <td className="px-4 py-3">{student.section || '-'}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openEditModal(student)}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteStudent(student.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 ml-2"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {students.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing <span>{startRecord}</span> to <span>{endRecord}</span> of{' '}
                  <span>{students.length}</span> students
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded ${
                      currentPage === 1
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((i) => i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1))
                    .map((i, idx, arr) => (
                      <div key={i} className="flex items-center gap-1">
                        {idx > 0 && arr[idx - 1] !== i - 1 && <span className="px-2">...</span>}
                        <button
                          onClick={() => setCurrentPage(i)}
                          className={`px-4 py-2 rounded ${
                            i === currentPage
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {i}
                        </button>
                      </div>
                    ))}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded ${
                      currentPage === totalPages
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add/Edit Student Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-3xl w-full mx-4 my-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              {editingStudent ? 'Edit Student' : 'Add Student'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="hidden" name="id" value={editingStudent?.id || ''} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="lrn" className="block text-sm font-medium text-gray-700 mb-1">
                    LRN *
                  </label>
                  <input
                    type="text"
                    id="lrn"
                    name="lrn"
                    required
                    defaultValue={editingStudent?.lrn || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label htmlFor="rfidUid" className="block text-sm font-medium text-gray-700 mb-1">
                    RFID Card UID 🎴
                  </label>
                  <input
                    type="text"
                    id="rfidUid"
                    name="rfid_uid"
                    placeholder="Tap RFID card or enter UID"
                    defaultValue={editingStudent?.rfid_uid || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Optional: For automatic student selection</p>
                </div>

                <div>
                  <label htmlFor="birthdate" className="block text-sm font-medium text-gray-700 mb-1">
                    Birthdate *
                  </label>
                  <input
                    type="date"
                    id="birthdate"
                    name="birthdate"
                    required
                    defaultValue={editingStudent?.birthdate || ''}
                    onChange={(e) => {
                      const age = calculateAge(e.target.value);
                      const ageInput = document.getElementById('age') as HTMLInputElement;
                      if (ageInput) ageInput.value = age.toString();
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="first_name"
                    required
                    defaultValue={editingStudent?.first_name || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label htmlFor="middleName" className="block text-sm font-medium text-gray-700 mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    id="middleName"
                    name="middle_name"
                    defaultValue={editingStudent?.middle_name || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="last_name"
                    required
                    defaultValue={editingStudent?.last_name || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    id="age"
                    name="age"
                    readOnly
                    defaultValue={editingStudent?.age || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                    Gender *
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    required
                    defaultValue={editingStudent?.gender || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="gradeLevel" className="block text-sm font-medium text-gray-700 mb-1">
                    Grade Level *
                  </label>
                  <select
                    id="gradeLevel"
                    name="grade_level"
                    required
                    defaultValue={editingStudent?.grade_level || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select Grade</option>
                    <option value="0">Kinder</option>
                    <option value="1">Grade 1</option>
                    <option value="2">Grade 2</option>
                    <option value="3">Grade 3</option>
                    <option value="4">Grade 4</option>
                    <option value="5">Grade 5</option>
                    <option value="6">Grade 6</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="section" className="block text-sm font-medium text-gray-700 mb-1">
                    Section
                  </label>
                  <input
                    type="text"
                    id="section"
                    name="section"
                    defaultValue={editingStudent?.section || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    id="contactNumber"
                    name="contact_number"
                    defaultValue={editingStudent?.contact_number || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  id="address"
                  name="address"
                  rows={2}
                  defaultValue={editingStudent?.address || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label htmlFor="parentGuardian" className="block text-sm font-medium text-gray-700 mb-1">
                  Parent/Guardian Name
                </label>
                <input
                  type="text"
                  id="parentGuardian"
                  name="parent_guardian"
                  defaultValue={editingStudent?.parent_guardian || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
