const App = (() => {
  const state = {
    token: localStorage.getItem("rent_token") || "",
    user: JSON.parse(localStorage.getItem("rent_user") || "null"),
    route: "home",
    authMode: "login"
  };

  const $ = (sel) => document.querySelector(sel);
  const app = $("#app");

  function api(path, options = {}) {
    const headers = options.headers ? {...options.headers} : {};
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    if (!(options.body instanceof FormData) && options.body !== undefined) headers["Content-Type"] = "application/json";
    return fetch(path, {...options, headers}).then(async r => {
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Request failed");
      return data;
    });
  }

  function toast(message, error=false) {
    const el = $("#toast"); el.textContent = message; el.className = `toast show${error ? " error":""}`;
    setTimeout(() => el.classList.remove("show"), 2600);
  }

  function escapeHtml(v="") {
    return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function money(v) { return `₹${Number(v||0).toLocaleString("en-IN")}/month`; }

  function updateNav() {
    $("#guestNav").classList.toggle("hidden", !!state.user);
    $("#userNav").classList.toggle("hidden", !state.user);
    $("#navUser").textContent = state.user ? `${state.user.name} · ${state.user.role}` : "";
  }

  function setAuth(data) {
    state.token = data.token; state.user = data.user;
    localStorage.setItem("rent_token", state.token);
    localStorage.setItem("rent_user", JSON.stringify(state.user));
    updateNav(); closeAuth(); toast("Welcome to RentEase");
    go("dashboard");
  }

  async function logout() {
    state.token = ""; state.user = null;
    localStorage.removeItem("rent_token"); localStorage.removeItem("rent_user");
    updateNav(); go("home"); toast("Logged out");
  }

  function authMode(mode) {
    state.authMode = mode;
    $("#loginTab").classList.toggle("active", mode==="login");
    $("#registerTab").classList.toggle("active", mode==="register");
    $("#authTitle").textContent = mode==="login" ? "Welcome back" : "Create your account";
    $("#authSub").textContent = mode==="login" ? "Sign in to your rental workspace." : "Register as a tenant or property owner.";
    $("#authForm").innerHTML = mode === "login" ? `
      <div class="field"><label>Email</label><input id="aEmail" type="email" required placeholder="you@example.com"></div>
      <div class="field"><label>Password</label><input id="aPassword" type="password" required placeholder="••••••••"></div>
      <button class="btn btn-primary" style="width:100%">Login</button>
      <p class="small-note" style="margin-top:12px">Demo: admin@example.com / Admin@123 · owner@example.com / Owner@123 · tenant@example.com / Tenant@123</p>
    ` : `
      <div class="field"><label>Full name</label><input id="aName" required></div>
      <div class="field"><label>Email</label><input id="aEmail" type="email" required></div>
      <div class="form-grid">
        <div class="field"><label>Password</label><input id="aPassword" type="password" minlength="8" required></div>
        <div class="field"><label>Account type</label><select id="aRole"><option value="tenant">Tenant</option><option value="owner">Property Owner</option></select></div>
      </div>
      <div class="field"><label>Phone</label><input id="aPhone" placeholder="+91 ..."></div>
      <div class="field"><label>Address</label><input id="aAddress"></div>
      <button class="btn btn-primary" style="width:100%">Create account</button>
    `;
    $("#authForm").onsubmit = submitAuth;
  }

  async function submitAuth(e) {
    e.preventDefault();
    try {
      const mode = state.authMode;
      const body = mode === "login"
        ? { email: $("#aEmail").value, password: $("#aPassword").value }
        : { name: $("#aName").value, email: $("#aEmail").value, password: $("#aPassword").value, role: $("#aRole").value, phone: $("#aPhone").value, address: $("#aAddress").value };
      const data = await api(`/api/auth/${mode==="login"?"login":"register"}`, {method:"POST", body: JSON.stringify(body)});
      setAuth(data);
    } catch(e) { toast(e.message, true); }
  }

  function openAuth(mode="login") {
    $("#authModal").classList.remove("hidden");
    authMode(mode);
  }
  function closeAuth() { $("#authModal").classList.add("hidden"); }
  function closePropertyModal() { $("#propertyModal").classList.add("hidden"); }

  function hero() {
    return `
      <section class="hero"><div class="container hero-grid">
        <div>
          <div class="eyebrow">Rental Property Management Portal</div>
          <h1>Find a place to live. Manage every rental from one workspace.</h1>
          <p class="lead">RentEase connects tenants, property owners and administrators with secure authentication, property management, applications, approvals and responsive dashboards.</p>
          <div class="btn-row"><button class="btn btn-primary" onclick="App.go('properties')">Explore Properties</button><button class="btn" onclick="App.openAuth('register')">Create Account</button></div>
          <div class="kpis-inline" style="margin-top:24px"><div class="kpi-chip"><b>3 roles</b>Tenant · Owner · Admin</div><div class="kpi-chip"><b>REST API</b>JWT protected</div><div class="kpi-chip"><b>Responsive</b>Desktop · Mobile</div></div>
        </div>
        <div class="hero-card"><div class="mock-image">🏠</div><div class="hero-stats"><div class="mini-stat"><b>24/7</b><span>Property search</span></div><div class="mini-stat"><b>CRUD</b><span>Property management</span></div><div class="mini-stat"><b>Secure</b><span>Role-based access</span></div></div></div>
      </div></section>
      <section class="section"><div class="container">
        <div class="section-head"><div><div class="eyebrow">Core modules</div><h2>Everything needed for the MVP</h2></div><p>Designed around the CountryEdu project brief.</p></div>
        <div class="feature-grid">
          <div class="feature"><div class="feature-icon">🔐</div><h3>Authentication</h3><p class="muted">Registration, login, JWT sessions and role-based authorization.</p></div>
          <div class="feature"><div class="feature-icon">🏢</div><h3>Property Management</h3><p class="muted">Owners can add, update, delete and manage listings with availability.</p></div>
          <div class="feature"><div class="feature-icon">📨</div><h3>Rental Requests</h3><p class="muted">Tenants apply to properties and owners can approve or reject requests.</p></div>
          <div class="feature"><div class="feature-icon">🔎</div><h3>Search & Filters</h3><p class="muted">Search by keyword, city, rent range, property type and bedrooms.</p></div>
          <div class="feature"><div class="feature-icon">🖼️</div><h3>Image Upload</h3><p class="muted">Property owners can upload multiple JPG, PNG or WEBP images.</p></div>
          <div class="feature"><div class="feature-icon">🛡️</div><h3>Admin Control</h3><p class="muted">Platform statistics, users, property approvals and request monitoring.</p></div>
        </div>
      </div></section>
      <section class="section"><div class="container"><div class="card" style="background:linear-gradient(135deg,#172033,#262f52);color:white"><div class="eyebrow" style="color:#aeb7ff">For the demonstration</div><h2 style="margin-top:7px">Test all three roles with ready-made demo accounts.</h2><p style="color:#cbd2e7">Use the Login button and choose the demo credentials shown in the login panel.</p></div></div></section>
      <footer class="footer"><div class="container">RentEase • Rental Property Management Portal • Internship Project MVP</div></footer>`;
  }

  async function propertiesPage() {
    app.innerHTML = `<div class="page-wrap"><div class="container">
      <div class="page-header"><div><div class="eyebrow">Tenant experience</div><h2>Find Properties</h2><p class="muted">Browse approved and currently available rental listings.</p></div></div>
      <form id="searchForm" class="search-panel">
        <input id="sq" placeholder="Search title, city or description">
        <input id="scity" placeholder="City">
        <select id="stype"><option value="">All types</option><option>Apartment</option><option>House</option><option>Studio</option><option>Villa</option><option>Room</option></select>
        <input id="smax" type="number" min="0" placeholder="Max rent">
        <button class="btn btn-primary">Search</button>
      </form>
      <div id="propertyResults"></div>
    </div></div>`;
    $("#searchForm").onsubmit = e => {e.preventDefault(); loadProperties();};
    await loadProperties();
  }

  async function loadProperties() {
    try {
      const q = new URLSearchParams({q:$("#sq")?.value||"",city:$("#scity")?.value||"",property_type:$("#stype")?.value||"",max_rent:$("#smax")?.value||""});
      const data = await api(`/api/properties?${q.toString()}`);
      const el = $("#propertyResults");
      if (!data.properties.length) {el.innerHTML = `<div class="empty">No matching properties found.</div>`; return;}
      el.innerHTML = `<div class="property-grid">${data.properties.map(propertyCard).join("")}</div>`;
    } catch(e) { $("#propertyResults").innerHTML = `<div class="empty">${escapeHtml(e.message)}</div>`; }
  }

  function propertyCard(p) {
    const img = p.images?.[0]?.image_url;
    return `<article class="property-card">
      <div class="property-photo">${img ? `<img src="${img}" alt="${escapeHtml(p.title)}">` : "🏠"}</div>
      <div class="property-body">
        <div class="eyebrow">${escapeHtml(p.property_type)}</div>
        <h3>${escapeHtml(p.title)}</h3>
        <div class="price">${money(p.rent)}</div>
        <div class="property-meta"><span class="chip">${p.bedrooms} BHK</span><span class="chip">${p.bathrooms} Bath</span><span class="chip">${p.area_sqft} sq ft</span><span class="chip">${escapeHtml(p.city)}</span></div>
        <p class="muted">${escapeHtml(p.description.slice(0,120))}${p.description.length>120?"…":""}</p>
        <div class="actions"><button class="btn" onclick="App.viewProperty(${p.id})">View Details</button><button class="btn btn-primary" onclick="App.applyToProperty(${p.id})">Apply</button></div>
      </div>
    </article>`;
  }

  async function viewProperty(id) {
    try {
      const {property:p} = await api(`/api/properties/${id}`);
      const img = p.images?.[0]?.image_url;
      $("#propertyModalBody").innerHTML = `<div class="detail-grid">
        <div><div id="mainDetailImage" class="detail-image">${img?`<img src="${img}" alt="">`:"🏠"}</div>
        ${p.images?.length ? `<div class="gallery">${p.images.map((x,i)=>`<img class="${i===0?"active":""}" src="${x.image_url}" onclick="App.swapImage('${x.image_url}',this)">`).join("")}</div>`:""}</div>
        <div><div class="eyebrow">${escapeHtml(p.property_type)} · ${escapeHtml(p.city)}, ${escapeHtml(p.state)}</div><h2 style="margin-top:7px">${escapeHtml(p.title)}</h2>
        <div class="price">${money(p.rent)}</div><div class="property-meta"><span class="chip">${p.bedrooms} Bedrooms</span><span class="chip">${p.bathrooms} Bathrooms</span><span class="chip">${p.area_sqft} sq ft</span></div>
        <p class="muted">${escapeHtml(p.description)}</p><p><b>Address:</b> ${escapeHtml(p.address)}</p><p><b>Owner:</b> ${escapeHtml(p.owner_name||"")}</p>
        <button class="btn btn-primary" onclick="App.applyToProperty(${p.id})">Submit Rental Request</button></div>
      </div>`;
      $("#propertyModal").classList.remove("hidden");
    } catch(e){toast(e.message,true);}
  }

  function swapImage(url, el) {
    $("#mainDetailImage").innerHTML = `<img src="${url}" alt="">`;
    document.querySelectorAll(".gallery img").forEach(x=>x.classList.remove("active")); el.classList.add("active");
  }

  async function applyToProperty(id) {
    if (!state.user) { openAuth("login"); toast("Please login as a tenant to apply.", true); return; }
    if (state.user.role !== "tenant") { toast("Rental applications are available for tenant accounts.", true); return; }
    const message = prompt("Optional message to the property owner:");
    try { await api("/api/rental-requests",{method:"POST",body:JSON.stringify({property_id:id,message:message||""})}); closePropertyModal(); toast("Rental request submitted."); if(state.route==="dashboard") renderDashboard(); } catch(e){toast(e.message,true);}
  }

  async function renderDashboard() {
    if (!state.user) return go("home");
    if (state.user.role === "tenant") return tenantDashboard();
    if (state.user.role === "owner") return ownerDashboard();
    return adminDashboard();
  }

  async function tenantDashboard() {
    let requests = [];
    try { requests = (await api("/api/rental-requests/mine")).requests; } catch(e) {}
    app.innerHTML = `<div class="dashboard"><div class="container">
      <div class="dash-top"><div><div class="eyebrow">Tenant dashboard</div><h2>Welcome, ${escapeHtml(state.user.name)}</h2><p class="muted">Search homes, track applications and keep your profile updated.</p></div><button class="btn btn-primary" onclick="App.go('properties')">Find a Home</button></div>
      <div class="dash-grid"><div class="metric"><small>Total applications</small><strong>${requests.length}</strong></div><div class="metric"><small>Pending</small><strong>${requests.filter(x=>x.status==="pending").length}</strong></div><div class="metric"><small>Approved</small><strong>${requests.filter(x=>x.status==="approved").length}</strong></div><div class="metric"><small>Rejected</small><strong>${requests.filter(x=>x.status==="rejected").length}</strong></div></div>
      <div class="dash-columns"><div class="card"><h3>My Rental Requests</h3><div class="table-wrap">${requestTable(requests,true)}</div></div><div class="card"><h3>My Profile</h3>${profileForm()}</div></div>
    </div></div>`;
    bindProfile();
  }

  function requestTable(rows, tenant=false) {
    if(!rows.length) return `<div class="empty">No rental requests yet.</div>`;
    return `<table class="table"><thead><tr><th>Property</th>${tenant?"<th>Owner</th>":"<th>Tenant</th><th>Email</th>"}<th>Status</th><th>Created</th>${!tenant?"<th>Actions</th>":""}</tr></thead><tbody>${rows.map(r=>`<tr><td>${escapeHtml(r.property_title)}</td>${tenant?`<td>${escapeHtml(r.owner_name)}</td>`:`<td>${escapeHtml(r.tenant_name)}</td><td>${escapeHtml(r.tenant_email)}</td>`}<td><span class="badge ${r.status==="approved"?"badge-green":r.status==="rejected"?"badge-red":"badge-yellow"}">${r.status}</span></td><td>${new Date(r.created_at).toLocaleDateString()}</td>${!tenant?`<td><button class="btn btn-success" onclick="App.updateRequest(${r.id},'approved')">Approve</button> <button class="btn btn-danger" onclick="App.updateRequest(${r.id},'rejected')">Reject</button></td>`:""}</tr>`).join("")}</tbody></table>`;
  }

  async function ownerDashboard() {
    let props=[], reqs=[];
    try { props=(await api("/api/owner/properties")).properties; reqs=(await api("/api/rental-requests/owner")).requests; } catch(e) {}
    app.innerHTML = `<div class="dashboard"><div class="container">
      <div class="dash-top"><div><div class="eyebrow">Property owner dashboard</div><h2>${escapeHtml(state.user.name)}</h2><p class="muted">Manage listings, availability and tenant applications.</p></div><button class="btn btn-primary" onclick="App.showAddProperty()">+ Add Property</button></div>
      <div class="dash-grid"><div class="metric"><small>Total listings</small><strong>${props.length}</strong></div><div class="metric"><small>Available</small><strong>${props.filter(p=>p.available).length}</strong></div><div class="metric"><small>Pending approval</small><strong>${props.filter(p=>p.approval_status==="pending").length}</strong></div><div class="metric"><small>Rental requests</small><strong>${reqs.length}</strong></div></div>
      <div class="dash-columns"><div class="stack">
        <div class="card"><div class="section-head"><div><h3>My Properties</h3><p>CRUD + image upload</p></div></div><div class="table-wrap">${ownerPropertyTable(props)}</div></div>
        <div id="propertyFormHost"></div>
      </div><div class="stack"><div class="card"><h3>Rental Requests</h3><div class="table-wrap">${requestTable(reqs,false)}</div></div><div class="card"><h3>Profile</h3>${profileForm()}</div></div></div>
    </div></div>`;
    bindProfile();
  }

  function ownerPropertyTable(props) {
    if(!props.length) return `<div class="empty">No listings yet.</div>`;
    return `<table class="table"><thead><tr><th>Property</th><th>Rent</th><th>Status</th><th>Approval</th><th>Actions</th></tr></thead><tbody>${props.map(p=>`<tr><td>${escapeHtml(p.title)}</td><td>${money(p.rent)}</td><td><span class="badge ${p.available?"badge-green":"badge-red"}">${p.available?"Available":"Occupied"}</span></td><td><span class="badge ${p.approval_status==="approved"?"badge-green":p.approval_status==="rejected"?"badge-red":"badge-yellow"}">${p.approval_status}</span></td><td><button class="btn" onclick='App.editProperty(${JSON.stringify(p)})'>Edit</button> <button class="btn" onclick="App.uploadImages(${p.id})">Images</button> <button class="btn btn-danger" onclick="App.deleteProperty(${p.id})">Delete</button></td></tr>`).join("")}</tbody></table>`;
  }

  function showAddProperty() {
    $("#propertyFormHost").innerHTML = propertyForm();
    bindPropertyForm();
    window.scrollTo({top:document.body.scrollHeight,behavior:"smooth"});
  }

  function propertyForm(p={}) {
    return `<div class="card"><div class="section-head"><div><h3>${p.id?"Edit Property":"Add Property"}</h3><p>${p.id?"Update your listing.":"New owner listings go to admin approval."}</p></div></div>
      <form id="propertyForm" class="form-grid">
        <input type="hidden" id="pfId" value="${p.id||""}">
        <div class="field span-2"><label>Property title *</label><input id="pfTitle" value="${escapeHtml(p.title||"")}" required></div>
        <div class="field span-2"><label>Description *</label><textarea id="pfDescription" required>${escapeHtml(p.description||"")}</textarea></div>
        <div class="field"><label>City *</label><input id="pfCity" value="${escapeHtml(p.city||"")}" required></div><div class="field"><label>State *</label><input id="pfState" value="${escapeHtml(p.state||"")}" required></div>
        <div class="field span-2"><label>Address *</label><input id="pfAddress" value="${escapeHtml(p.address||"")}" required></div>
        <div class="field"><label>Monthly rent *</label><input id="pfRent" type="number" min="1" value="${p.rent||""}" required></div>
        <div class="field"><label>Bedrooms</label><input id="pfBeds" type="number" min="0" value="${p.bedrooms??2}"></div>
        <div class="field"><label>Bathrooms</label><input id="pfBaths" type="number" min="0" value="${p.bathrooms??1}"></div>
        <div class="field"><label>Area (sq ft)</label><input id="pfArea" type="number" min="0" value="${p.area_sqft??800}"></div>
        <div class="field"><label>Property type</label><select id="pfType">${["Apartment","House","Studio","Villa","Room"].map(x=>`<option ${x===p.property_type?"selected":""}>${x}</option>`).join("")}</select></div>
        <div class="field"><label>Availability</label><select id="pfAvailable"><option value="true" ${(p.available??true)?"selected":""}>Available</option><option value="false" ${p.available===false?"selected":""}>Occupied</option></select></div>
        <div class="span-2 btn-row"><button class="btn btn-primary">${p.id?"Save Changes":"Create Listing"}</button><button type="button" class="btn" onclick="$('#propertyFormHost').innerHTML=''">Cancel</button></div>
      </form></div>`;
  }

  function bindPropertyForm() {
    $("#propertyForm").onsubmit = async e => {
      e.preventDefault();
      const id = $("#pfId").value;
      const body = {title:$("#pfTitle").value,description:$("#pfDescription").value,city:$("#pfCity").value,state:$("#pfState").value,address:$("#pfAddress").value,rent:Number($("#pfRent").value),bedrooms:Number($("#pfBeds").value),bathrooms:Number($("#pfBaths").value),area_sqft:Number($("#pfArea").value),property_type:$("#pfType").value,available:$("#pfAvailable").value==="true"};
      try { await api(id?`/api/properties/${id}`:"/api/properties",{method:id?"PUT":"POST",body:JSON.stringify(body)}); toast(id?"Property updated":"Property created"); ownerDashboard(); } catch(e){toast(e.message,true);}
    };
  }

  async function editProperty(p) {
    $("#propertyFormHost").innerHTML = propertyForm(p); bindPropertyForm();
    window.scrollTo({top:document.body.scrollHeight,behavior:"smooth"});
  }

  async function deleteProperty(id) {
    if(!confirm("Delete this property and its rental requests?")) return;
    try { await api(`/api/properties/${id}`,{method:"DELETE"}); toast("Property deleted"); ownerDashboard(); } catch(e){toast(e.message,true);}
  }

  async function uploadImages(id) {
    const files = await chooseFiles();
    if (!files?.length) return;
    const fd = new FormData(); [...files].forEach(f=>fd.append("images",f));
    try { await api(`/api/properties/${id}/images`,{method:"POST",body:fd}); toast("Images uploaded"); ownerDashboard(); } catch(e){toast(e.message,true);}
  }

  function chooseFiles() {
    return new Promise(resolve => {
      const input=document.createElement("input"); input.type="file"; input.accept="image/jpeg,image/png,image/webp"; input.multiple=true;
      input.onchange=()=>resolve(input.files); input.click();
    });
  }

  function profileForm() {
    return `<form id="profileForm">
      <div class="field"><label>Name</label><input id="prName" value="${escapeHtml(state.user.name||"")}"></div>
      <div class="field"><label>Email</label><input value="${escapeHtml(state.user.email||"")}" disabled></div>
      <div class="field"><label>Phone</label><input id="prPhone" value="${escapeHtml(state.user.phone||"")}"></div>
      <div class="field"><label>Address</label><textarea id="prAddress">${escapeHtml(state.user.address||"")}</textarea></div>
      <button class="btn btn-primary">Save Profile</button>
    </form>`;
  }

  function bindProfile() {
    const form=$("#profileForm"); if(!form)return;
    form.onsubmit=async e=>{e.preventDefault();try{const d=await api("/api/profile",{method:"PUT",body:JSON.stringify({name:$("#prName").value,phone:$("#prPhone").value,address:$("#prAddress").value})});state.user=d.user;localStorage.setItem("rent_user",JSON.stringify(state.user));updateNav();toast("Profile updated");}catch(e){toast(e.message,true);}};
  }

  async function updateRequest(id,status) {
    try { await api(`/api/rental-requests/${id}/status`,{method:"PATCH",body:JSON.stringify({status})}); toast(`Request ${status}`); ownerDashboard(); } catch(e){toast(e.message,true);}
  }

  async function adminDashboard() {
    let stats={users:0,properties:0,available:0,pendingProperties:0,requests:0}, users=[], props=[], reqs=[];
    try { stats=(await api("/api/admin/stats")).stats; users=(await api("/api/admin/users")).users; props=(await api("/api/admin/properties")).properties; reqs=(await api("/api/rental-requests/owner")).requests; } catch(e) {}
    app.innerHTML = `<div class="dashboard"><div class="container">
      <div class="dash-top"><div><div class="eyebrow">Admin dashboard</div><h2>Platform control center</h2><p class="muted">Manage users, listings and rental requests.</p></div><span class="badge badge-blue">Administrator</span></div>
      <div class="dash-grid"><div class="metric"><small>Users</small><strong>${stats.users}</strong></div><div class="metric"><small>Properties</small><strong>${stats.properties}</strong></div><div class="metric"><small>Available</small><strong>${stats.available}</strong></div><div class="metric"><small>Requests</small><strong>${stats.requests}</strong></div></div>
      <div class="section-tabs" style="margin-top:20px">
        <button class="pill active" onclick="App.adminTab('overview')">Overview</button><button class="pill" onclick="App.adminTab('properties')">Properties</button><button class="pill" onclick="App.adminTab('users')">Users</button><button class="pill" onclick="App.adminTab('requests')">Rental Requests</button>
      </div>
      <div id="adminContent"></div>
    </div></div>`;
    adminTab("overview", {stats,users,props,reqs});
  }

  async function adminTab(type, cache=null) {
    const host=$("#adminContent"); if(!host)return;
    let data=cache;
    if(!data) {
      try {
        data={};
        if(type==="properties") data.props=(await api("/api/admin/properties")).properties;
        if(type==="users") data.users=(await api("/api/admin/users")).users;
        if(type==="requests") data.reqs=(await api("/api/rental-requests/owner")).requests;
        if(type==="overview") {data.stats=(await api("/api/admin/stats")).stats;}
      } catch(e){host.innerHTML=`<div class="empty">${escapeHtml(e.message)}</div>`;return;}
    }
    if(type==="overview") host.innerHTML=`<div class="grid feature-grid"><div class="card"><h3>Pending approvals</h3><div class="price">${data.stats.pendingProperties}</div><p class="muted">Properties waiting for admin review.</p></div><div class="card"><h3>Available inventory</h3><div class="price">${data.stats.available}</div><p class="muted">Approved and available listings.</p></div><div class="card"><h3>API health</h3><div class="price" style="color:var(--good)">Healthy</div><p class="muted">JWT REST API + SQLite online.</p></div></div>`;
    if(type==="properties") host.innerHTML=adminPropertiesTable(data.props||[]);
    if(type==="users") host.innerHTML=adminUsersTable(data.users||[]);
    if(type==="requests") host.innerHTML=`<div class="card"><h3>All Rental Requests</h3><div class="table-wrap">${requestTable(data.reqs||[],false)}</div></div>`;
  }

  function adminPropertiesTable(rows) {
    if(!rows.length)return `<div class="empty">No properties.</div>`;
    return `<div class="card"><h3>Property Moderation</h3><div class="table-wrap"><table class="table"><thead><tr><th>Property</th><th>Owner</th><th>Rent</th><th>Approval</th><th>Availability</th><th>Actions</th></tr></thead><tbody>${rows.map(p=>`<tr><td>${escapeHtml(p.title)}</td><td>${escapeHtml(p.owner_name)}</td><td>${money(p.rent)}</td><td><span class="badge ${p.approval_status==="approved"?"badge-green":p.approval_status==="rejected"?"badge-red":"badge-yellow"}">${p.approval_status}</span></td><td>${p.available?"Available":"Occupied"}</td><td><button class="btn btn-success" onclick="App.adminPropertyStatus(${p.id},'approved')">Approve</button> <button class="btn btn-danger" onclick="App.adminPropertyStatus(${p.id},'rejected')">Reject</button></td></tr>`).join("")}</tbody></table></div></div>`;
  }

  function adminUsersTable(rows) {
    return `<div class="card"><h3>Users</h3><div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Created</th></tr></thead><tbody>${rows.map(u=>`<tr><td>${escapeHtml(u.name)}</td><td>${escapeHtml(u.email)}</td><td><span class="badge badge-blue">${u.role}</span></td><td>${escapeHtml(u.phone||"-")}</td><td>${new Date(u.created_at).toLocaleDateString()}</td></tr>`).join("")}</tbody></table></div></div>`;
  }

  async function adminPropertyStatus(id,status) {
    try {await api(`/api/admin/properties/${id}/status`,{method:"PATCH",body:JSON.stringify({approval_status:status})});toast(`Property ${status}`);adminDashboard();}catch(e){toast(e.message,true);}
  }

  function about() {
    app.innerHTML=`<div class="page-wrap"><div class="container">
      <div class="card"><div class="eyebrow">Project</div><h2>Rental Property Management Portal</h2><p class="lead">A responsive full-stack MVP for rental property discovery and management.</p>
      <div class="feature-grid" style="margin-top:20px"><div class="feature"><h3>Tenant Module</h3><p class="muted">Registration, login, dashboard, property search, detailed property view, rental requests, status tracking and profile.</p></div>
      <div class="feature"><h3>Property Owner Module</h3><p class="muted">Registration, login, dashboard, add/update/delete properties, request management, image upload and profile.</p></div>
      <div class="feature"><h3>Admin Module</h3><p class="muted">Dashboard, users, properties, approvals and request monitoring.</p></div>
      <div class="feature"><h3>Technology</h3><p class="muted">Node.js, Express, SQLite, JWT, Multer, HTML, CSS and JavaScript.</p></div>
      <div class="feature"><h3>API</h3><p class="muted">REST endpoints for authentication, properties, rental requests, profile and admin operations.</p></div>
      <div class="feature"><h3>Deployment</h3><p class="muted">Designed as one service so frontend and backend can be deployed together.</p></div></div></div>
      <footer class="footer" style="margin-top:30px">RentEase • Internship Project MVP</footer>
    </div></div>`;
  }

  function go(route) {
    state.route=route;
    if(route==="home") app.innerHTML=hero();
    else if(route==="properties") propertiesPage();
    else if(route==="about") about();
    else if(route==="dashboard") renderDashboard();
    window.scrollTo({top:0,behavior:"smooth"});
  }

  updateNav();
  go("home");

  return {go,openAuth,closeAuth,authMode,logout,viewProperty,closePropertyModal,swapImage,applyToProperty,showAddProperty,editProperty,deleteProperty,uploadImages,updateRequest,adminTab,adminPropertyStatus};
})();
